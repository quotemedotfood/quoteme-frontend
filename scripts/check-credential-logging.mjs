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
// that holds a credential, may not log a whole identity object, and may not
// interpolate a raw URL or navigation target (which is how a magic-link token
// reaches a log without any credential-named identifier being involved).
//
//   BAD   console.log('token', token.substring(0, 20));
//   BAD   console.log(headers['Authorization']);
//   BAD   console.log(user);              // leaks email + role, often a token
//   BAD   console.error(`refusing ${target}`);   // target holds ?token=...
//   OK    console.log('token present:', !!token);        // boolean presence
//   OK    console.log('token length:', token.length);
//   OK    console.error(`refusing ${routePathOnly(target)}`);  // sanitized
//
// Escape hatch: put `allow-credential-log` in a comment on the offending line
// or the line above it. Use it only for a genuine presence/length diagnostic.
//
// WHAT THIS GUARD DOES NOT COVER, stated plainly so nobody reads a green run as
// proof of absence. It is a syntactic check on direct `console.<method>(...)`
// call sites, so all of these slip past it:
//   - an aliased console: `const c = console; c.log(token)`
//   - a destructured method: `const { log } = console; log(token)`
//   - a computed member access: `headers[headerName]`, `obj[key]`
//   - an intermediate variable: `const s = token.slice(0, 8); console.log(s)`
//     (the name `s` carries no credential signal)
//   - a string built earlier and logged later
//   - an OPAQUE path-segment token (`/c/abc123`), which is indistinguishable
//     from an ordinary path
//   - any logging that is not `console.*` (a logger wrapper, a toast, the DOM)
// It exists to stop the specific regression that shipped to production, not to
// prove the absence of every leak.
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
// `hasToken`, `isAuthorized`, `tokenCount`, `tokenLength`.
//
// This used to also exempt /[A-Z0-9_]*KEY/, meant for storage-key constants
// like TOKEN_KEY. That pattern also exempted API_KEY, SECRET_KEY and JWT_KEY,
// which are real credentials, so the shape test is gone and storage-key names
// are an explicit allowlist instead. There is no way to tell TOKEN_KEY (the
// string "quoteme_token") from API_KEY (a secret) by shape, so it has to be
// enumerated.
const SAFE_NAME_RE =
  /^(?:(?:has|is|any|no|should|can|was|were)[A-Z_].*|.*(?:Count|Length|count|length))$/;

const SAFE_NAME_ALLOWLIST = new Set([
  'TOKEN_KEY',
  'AUTH_TOKEN_KEY',
  'GUEST_TOKEN_KEY',
  'ADMIN_TOKEN_KEY',
  'STORAGE_KEY',
  'GUEST_TRACE_ID_KEY',
  'PRIOR_SESSION_KEYS_TO_CLEAR',
  'SENSITIVE_HEADER_NAMES',
  'SENSITIVE_QUERY_PARAMS',
]);

function isSafeName(name) {
  return SAFE_NAME_ALLOWLIST.has(name) || SAFE_NAME_RE.test(name);
}

// A bare identity object: logging it dumps email, role and often a token.
const IDENTITY_RE = /^(user|users|profile|currentUser|me|account|session|credentials|creds)$/i;

// A URL or navigation target. This is the class the first version of this
// guard missed entirely: useSessionOnUse.ts interpolated the whole rejected
// `target` into a console.error, and that target is exactly the one carrying a
// raw magic-link token in ?token=. No credential-named identifier is involved,
// so CRED_RE never fired. A magic-link token is a full login credential, which
// makes this the most serious of the four sites that shipped.
//
// Matched on EXACT identifier / property names only, so `voice_note_url` and
// other domain fields do not trip it. Sanitized calls are pruned below.
//
// DELIBERATELY NARROW. `to`, `from`, `link`, `path` and `location` were in this
// list and produced false positives on legitimate code in this very repo: date
// ranges named from/to, geo objects named `location` (LocationContext), and
// `console.log('link id', link.id)`, which tripped because the walk records the
// object name as well as the member. A gate that cries wolf on
// `console.log('geo', location)` gets switched off by the third developer who
// hits it, and then it guards nothing. Only unambiguous URL-carrying names stay.
const URLISH_RE =
  /^(target|url|href|pathname|redirect|redirectTo|returnTo|callbackUrl|nextUrl|magicLink)$/i;

// Calls whose RESULT is already sanitized. The subtree is pruned, so passing a
// raw target through one of these is the documented way to log a route.
// Node builtin module namespaces whose name collides with URLISH_RE.
const NODE_MODULE_NAMES = new Set(['path', 'url', 'fs', 'os']);

const SANITIZER_NAMES = new Set([
  'routePathOnly',
  'redactUrl',
  'redactString',
  'scrubSentryEvent',
  'scrubSentrySpan',
]);

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
  if (isPruned(node)) return out;

  if (ts.isIdentifier(node)) out.push(node.text);
  else if (ts.isPropertyAccessExpression(node)) {
    out.push(node.name.text);
    // `url.parse(...)` / `path.join(...)`: the object is the Node builtin
    // module, not a route value. Record the member but do not record the
    // module name, which would otherwise trip URLISH_RE in build scripts.
    // A BARE `url` identifier is still reported.
    if (ts.isIdentifier(node.expression) && NODE_MODULE_NAMES.has(node.expression.text)) {
      return out;
    }
  } else if (ts.isElementAccessExpression(node) && node.argumentExpression) {
    const arg = node.argumentExpression;
    if (ts.isStringLiteralLike(arg)) out.push(arg.text);
  } else if (ts.isPropertyAssignment(node)) {
    // `{ tokenPrefix: token.substring(0, 20) }` leaks; `{ hasToken: !!token }`
    // does not. Judge the key by whether its VALUE is presence-only.
    const keyIsName = ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name);
    if (keyIsName && !isPruned(node.initializer)) out.push(node.name.text);
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

/** A call to a known sanitizer: `routePathOnly(target)`, `redactUrl(href)`.
 * The whole subtree is pruned, so the raw argument inside it is not reported.
 * This is the sanctioned way to log a route or a URL. */
function isSanitizerCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return SANITIZER_NAMES.has(callee.text);
  if (ts.isPropertyAccessExpression(callee)) return SANITIZER_NAMES.has(callee.name.text);
  return false;
}

/** Subtrees that carry no value: a presence/size expression, or a sanitized
 * call result. */
function isPruned(node) {
  return isPresenceOnly(node) || isSanitizerCall(node);
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

function hasPragma(lines, lineIndex) {
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
        if (!isPruned(arg)) {
          for (const name of referencedNames(arg)) {
            if (isSafeName(name)) continue;
            if (CRED_RE.test(name)) reasons.push(`credential identifier "${name}"`);
            else if (URLISH_RE.test(name)) {
              reasons.push(
                `raw URL or navigation target "${name}" (may carry ?token=; wrap it in routePathOnly()/redactUrl())`,
              );
            }
          }
        }
        if (ts.isIdentifier(arg) && IDENTITY_RE.test(arg.text)) {
          reasons.push(`whole identity object "${arg.text}"`);
        }
        if (reasons.length === 0) continue;

        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        if (hasPragma(lines, line)) continue;
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
