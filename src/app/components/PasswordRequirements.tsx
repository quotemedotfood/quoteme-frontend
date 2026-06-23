// PasswordRequirements — inline real-time password hint checklist.
//
// Renders a compact guidance checklist showing which of the 4 BE-enforced
// password rules are met as the user types. Met = green check, unmet = gray dot.
// Guidance-first: shown while the field has content, never blocks typing.
//
// Export: <PasswordRequirements password={string} /> + passwordMeetsRequirements(password)

import { Check } from 'lucide-react';

// ─── Rules ────────────────────────────────────────────────────────────────────

const RULES = [
  { key: 'length',    label: 'At least 8 characters',   test: (p: string) => p.length >= 8 },
  { key: 'upper',     label: 'One uppercase letter',     test: (p: string) => /[A-Z]/.test(p) },
  { key: 'digit',     label: 'One number',               test: (p: string) => /[0-9]/.test(p) },
  { key: 'special',   label: 'One special character',    test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

// ─── Helper (exported for form submit-validation) ─────────────────────────────

export function passwordMeetsRequirements(password: string): boolean {
  return RULES.every((r) => r.test(password));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  // Don't render until the user has started typing
  if (!password) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1" aria-label="Password requirements">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.key} className="flex items-center gap-1.5">
            {met ? (
              <Check className="size-3.5 shrink-0 text-green-600" aria-hidden="true" />
            ) : (
              <span className="size-3.5 shrink-0 flex items-center justify-center" aria-hidden="true">
                <span className="block size-1.5 rounded-full bg-gray-300" />
              </span>
            )}
            <span className={`text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
