/**
 * quotaGate.ts
 *
 * C-2 / B-28 — centralises the "should the subscribe CTA show?" decision.
 *
 * Rule (B-28):
 *   Show the subscribe CTA only when free-quota is at/near exhaustion:
 *   used >= limit (quota fully consumed).
 *
 *   A user with quotes remaining (used < limit) is still building freely —
 *   showing the CTA then is premature and contradicts the quota display.
 *
 * Both SettingsPage and ChefSettingsTab import this function so the rule
 * lives in exactly one place.
 */

export interface QuotaBilling {
  has_paid_subscription: boolean;
  quotes_used?: number;
  quotes_limit?: number;
  plan_name?: string | null;
  price_dollars?: number | null;
  interval?: string | null;
}

/**
 * Returns true when the subscribe/upgrade CTA should be shown.
 *
 * Criteria:
 *   - Not already subscribed
 *   - Free quota is exhausted (used >= limit) OR limit is unknown (defensive: hide)
 */
export function shouldShowSubscribeCta(billing: QuotaBilling | null | undefined): boolean {
  if (!billing) return false;
  if (billing.has_paid_subscription) return false;

  const used = billing.quotes_used ?? 0;
  const limit = billing.quotes_limit ?? 5;
  return used >= limit;
}

/**
 * Returns the plan label for billing section headers.
 *   Paid  → "Pro · $20/month"
 *   Free  → "Free"
 *   null  → null (caller should show a loading placeholder)
 *
 * B-141 — replaces hardcoded "Free" in ChefSettingsTab mobile + desktop billing sections.
 */
export function billingPlanLabel(billing: QuotaBilling | null | undefined): string | null {
  if (billing == null) return null;
  if (billing.has_paid_subscription) {
    const name = billing.plan_name || 'Premium';
    const interval = billing.interval || 'month';
    const price = billing.price_dollars != null ? `$${billing.price_dollars}` : null;
    return price ? `${name} · ${price}/${interval}` : name;
  }
  return 'Free';
}

/**
 * Returns the quota display string for billing surfaces.
 * e.g. "3 of 5 quotes used · 2 left"
 */
export function quotaDisplayText(billing: QuotaBilling | null | undefined): string {
  if (!billing || billing.has_paid_subscription) return '';

  const used = billing.quotes_used ?? 0;
  const limit = billing.quotes_limit ?? 5;
  const remaining = Math.max(0, limit - used);

  if (remaining === 0) return `${used} of ${limit} quotes used · 0 left`;
  return `${used} of ${limit} quotes used · ${remaining} left`;
}
