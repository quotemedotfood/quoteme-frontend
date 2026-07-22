// BUG #30: a chef's question is 200'd + persisted (buyer_notes and a
// notification_type: "chef_question" Notification) by
// Chef::QuotesController#question, but was never surfaced in-app to the
// rep. The BE now serializes chef_questions[] (oldest-first) and
// has_unanswered_chef_question onto the quote payload (see
// QuoteSerializable) and onto CC ledger rows / quote detail. This helper
// picks the single question worth showing when a surface only has room for
// one (Quote Builder banner, Export/Finalize banner, CC quote detail banner).

import type { ChefQuestion } from '../services/api';

/**
 * Returns the most recent chef question in the thread, or null when the
 * chef has never asked one. The BE returns chef_questions ordered
 * oldest-first, so the latest one is simply the last element.
 */
export function latestChefQuestion(
  questions: ChefQuestion[] | undefined | null
): ChefQuestion | null {
  if (!questions || questions.length === 0) return null;
  return questions[questions.length - 1];
}
