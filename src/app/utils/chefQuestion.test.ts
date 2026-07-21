// BUG #30: a chef's question is persisted + emailed but was never surfaced
// in-app to the rep. These are pure-function tests for the small selector
// helper shared by QuoteBuilderPage / ExportFinalizePage / CCQuoteDetailPage
// to pick "the question to show" out of the chef_questions[] thread the BE
// now serializes onto a quote.

import { describe, it, expect } from 'vitest';
import { latestChefQuestion } from './chefQuestion';
import type { ChefQuestion } from '../services/api';

const question = (overrides: Partial<ChefQuestion> = {}): ChefQuestion => ({
  id: 'q-1',
  body: 'Do you carry a gluten-free option?',
  created_at: '2026-07-20T12:00:00Z',
  read: false,
  ...overrides,
});

describe('latestChefQuestion', () => {
  it('returns null when there are no questions', () => {
    expect(latestChefQuestion(undefined)).toBeNull();
    expect(latestChefQuestion([])).toBeNull();
  });

  it('returns the single question when there is only one', () => {
    const q = question();
    expect(latestChefQuestion([q])).toBe(q);
  });

  it('returns the last item in the array (BE serializes oldest-first)', () => {
    const first = question({ id: 'q-1', body: 'First question' });
    const second = question({ id: 'q-2', body: 'Second question' });
    expect(latestChefQuestion([first, second])).toBe(second);
  });
});
