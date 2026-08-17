#!/usr/bin/env node
// Guards against credential material reaching the browser console.
//
// Why this exists: the production client logged the bearer token (a 20 char
// prefix of it) on every authenticated route mount, because /me is called on
// every mount and fetchWithAuth logged the token prefix and the Authorization
// header for /me. A prefix is not a redaction: it is still credential
// material and it still identifies the holder. Same class of bug had also put
// a magic-link token into a console.error and a guest-token prefix into a
// Sentry user id.
//
// The rule enforced here: a `console.*` call may not reference an identifier
// that holds a credential, and may not log a whole identity object.
//
//   BAD   console.log('token', token.substring(0, 20));
//   BAD   console.log(headers['Authorization']);
//   BAD   console.log(user);            // leaks email + role, often a token
//   OK    console.log('token present:', !!token);   // boolean presence
//   OK    console.log('token length:', token.length);
//
// Escape hatch: put `allow-credential-log` in a comment on the offending line
// or the line above it. Use it only for a genuine presence/length diagnostic.
//
// Run: node scripts/check-credential-logging.mjs   (npm run check:credlog)
// Optional args: one or more roots to scan (default: src apps packages).

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['src', 'apps', 'packages'].filter((d) => fs.existsSync(d));

// Identifier / property names that hold a credential value.
const CRED_RE =
  /(token|jwt|passwd|password|secret|credential|authoriz|bearer|api[-_]?key|apikey|cookie)/i;

// Names that are safe by construction: booleans and sizes, not values.
// `hasToken`, `isAuthorized`, `tokenCount`, `tokenLength`, `TOKEN_KEY` (a
// storage key name, not the token) and the two guard constants in this repo.
const SAFE_NAME_RE =
  /^(?:(?:has|is|any|no|should|can|was|were)[A-Z_].*|.*(?:Count|Length|count|length)|[A-Z0-9_]*KEY|SENSITIVE_[A-Z_]+)$/;

// A bare identity object: logging it dumps email, role and often a token.
const IDENTITY_RE = /^(user|users|profile|currentUser|me|account|session|credentials|creds)$/i;

const EXCLUDE_PATH = [
  /\.test\.[cm]?[jt]sx?$/,
  /\.spec\.[cm]?[jt]sx?$/,
  /[\\/]__tests__[\\/]/,
  /[\\/]__mocks__[\\/]/,
  /\.stories\.[cm]?[jt]sx?$/,
  /[\\/]node_modules[\\/]/,
  /[\\/]dist[\\/]/,
  /[\\/]build[\\/]/,
];

function isExcluded(filePath) {
  return EXCLUDE_PATH.some((re) => re.test(filePath));
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      walk(full, out);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** True for `console.<anything>(...)`. */
function isConsoleCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee)) return false;
  return ts.isIdentifier(callee.expression) && callee.expression.text === 'console';
}

/** The names an expression subtree refers to: identifiers, property names,
 * and string-literal index accesses (headers['Authorization']).
 *
 * Subtrees that only express presence or size (`!!token`, `token.length`,
 * `token ? 'present' : 'missing'`) are pruned, so a legitimate diagnostic
 * nested inside an object literal is not reported. */
function referencedNames(node, out = []) {
  if (isPresenceOnly(node)) return out;

  if (ts.isIdentifier(node)) out.push(node.text);
  else if (ts.isPropertyAccessExpression(node)) out.push(node.name.text);
  else if (ts.isElementAccessExpression(node) && node.argumentExpression) {
    const arg = node.argumentExpression;
    if (ts.isStringLiteralLike(arg)) out.push(arg.text);
  } else if (ts.isPropertyAssignment(node)) {
    // `{ tokenPrefix: token.substring(0, 20) }` leaks; `{ hasToken: !!token }`
    // does not. Judge the key by whether its VALUE is presence-only.
    const keyIsName = ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name);
    if (keyIsName && !isPresenceOnly(node.initializer)) out.push(node.name.text);
    referencedNames(node.initializer, out);
    return out;
  }

  // The callback must return undefined: ts.forEachChild stops walking as soon
  // as a callback returns a truthy value, which would silently visit only the
  // first child (that bug hid the Authorization-header log from this guard).
  ts.forEachChild(node, (child) => {
    referencedNames(child, out);
  });
  return out;
}

/** A boolean-presence or size expression is not a value leak. */
function isPresenceOnly(arg) {
  // !!token / !token: a negation evaluates to a boolean, whatever it wraps.
  if (ts.isPrefixUnaryExpression(arg)) {
    return arg.operator === ts.SyntaxKind.ExclamationToken;
  }
  // token.length / token?.length
  if (ts.isPropertyAccessExpression(arg) && arg.name.text === 'length') return true;
  // token ? 'present' : 'missing'  (both branches literal)
  if (ts.isConditionalExpression(arg)) {
    return (
      ts.isStringLiteralLike(arg.whenTrue) &&
      ts.isStringLiteralLike(arg.whenFalse)
    );
  }
  return false;
}

function hasPragma(text, lines, lineIndex) {
  const here = lines[lineIndex] || '';
  const above = lineIndex > 0 ? lines[lineIndex - 1] : '';
  return /allow-credential-log/.test(here) || /allow-credential-log/.test(above);
}

const files = ROOTS.flatMap((root) =>
  fs.statSync(root).isDirectory() ? walk(root, []) : [root],
);
const offenders = [];

for (const file of files) {
  if (isExcluded(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('console.')) continue;
  const lines = text.split('\n');

  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node) => {
    if (isConsoleCall(node)) {
      for (const arg of node.arguments) {
        // A plain string literal argument is a message, not a value. Template
        // literals are NOT exempt: their substitutions carry values.
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) continue;

        const reasons = [];
        if (!isPresenceOnly(arg)) {
          for (const name of referencedNames(arg)) {
            if (SAFE_NAME_RE.test(name)) continue;
            if (CRED_RE.test(name)) reasons.push(`credential identifier "${name}"`);
          }
        }
        if (ts.isIdentifier(arg) && IDENTITY_RE.test(arg.text)) {
          reasons.push(`whole identity object "${arg.text}"`);
        }
        if (reasons.length === 0) continue;

        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        if (hasPragma(text, lines, line)) continue;
        offenders.push({
          file,
          line: line + 1,
          reason: [...new Set(reasons)].join(', '),
          text: (lines[line] || '').trim().slice(0, 140),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

// One violation per line is enough noise.
const unique = [];
const seen = new Set();
for (const o of offenders) {
  const key = `${o.file}:${o.line}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(o);
}

if (unique.length > 0) {
  console.log(
    `check:credlog: found ${unique.length} console call(s) that reference credential material:`,
  );
  for (const o of unique) console.log(`  ${o.file}:${o.line}: ${o.reason}\n      ${o.text}`);
  console.log('');
  console.log('Remove the log. A prefix or suffix of a token is NOT a redaction. If a');
  console.log('diagnostic is genuinely needed, log a boolean presence (!!token) or a');
  console.log('length, and add an "allow-credential-log" comment on the line above.');
  process.exit(1);
} else {
  console.log(
    `check:credlog: no credential-bearing console calls in ${ROOTS.join(', ')}. OK.`,
  );
  process.exit(0);
}
