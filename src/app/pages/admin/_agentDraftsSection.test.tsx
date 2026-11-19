// Draft taste profiles, the QM admin screens (Moose Q95 to Q98).
//
// GUARDS:
//   DS1 Confirm sends the name, category and profile ids, and never a score
//   DS2 Edit: dropping a profile asks the server to add up the rest, the
//       card says edited, and Confirm sends only the kept ids
//   DS3 Reject calls reject and the card shows rejected, with no Confirm
//   DS4 on Corpus Lookup only the typed food's draft shows; another food shows
//       nothing
//   DS5 a suggested attribute's Approve calls approve and leaves the list
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const entry = {
  id: 'row-1', status: 'draft', food: 'Barbecue Ribs', component_text: 'barbecue ribs', cluster_label_id: null, name: null, category: null,
  tags: [{ cluster_label_id: 'h-bbq', name: 'bbq', from: 'words', pairme_dish_axis_ids: ['p-smoky'] },
         { cluster_label_id: 'h-ribs', name: 'ribs', from: 'words', pairme_dish_axis_ids: ['p-pork'] }],
  pairme_dish_axis_ids: ['p-smoky', 'p-pork'],
  scores: { weight: 3, fat: 3, acid: 1, sweetness: 2, heat: 1, salt: 2, umami: 3, bitter: 1 },
  rules: [], left_out_profile_ids: [], made_at: null, store_slugs: ['total-bev-westminster'], occurrence_count: 2,
  default_category: 'meat', when: '2026-11-19T10:00:00Z',
};

const api = vi.hoisted(() => ({
  getAgentDrafts: vi.fn(),
  confirmAgentDraft: vi.fn(),
  rejectAgentDraft: vi.fn(),
  previewDraftProfiles: vi.fn(),
  searchDraftProfiles: vi.fn(async () => ({ data: { profiles: [] } })),
  getCorpusAttributes: vi.fn(),
  approveCorpusAttribute: vi.fn(async () => ({ data: {} })),
  dismissCorpusAttribute: vi.fn(async () => ({ data: {} })),
  getCorpusLookup: vi.fn(async () => ({ data: { kinds: [], store: { name: 'Total Beverage' } } })),
  getStoredRulesBundle: vi.fn(async () => ({ error: 'none', status: 404 })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

import { AgentDraftsSection } from './_agentDraftsSection';

function setup(entries = [entry], attributes: unknown[] = []) {
  api.getAgentDrafts.mockResolvedValue({ data: { entries, categories: ['meat', 'sauce'] } });
  api.getCorpusAttributes.mockResolvedValue({ data: { attributes } });
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('draft taste profiles', () => {
  it('DS1 Confirm sends name, category and profile ids, never a score', async () => {
    setup();
    api.confirmAgentDraft.mockResolvedValue({ data: { cluster_label_id: 'new', name: 'Barbecue Ribs', category: 'meat', entry: { ...entry, status: 'confirmed' } } });
    render(<AgentDraftsSection />);
    const card = await screen.findByTestId('draft-card');
    fireEvent.click(within(card).getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(api.confirmAgentDraft).toHaveBeenCalled());
    const [id, body] = api.confirmAgentDraft.mock.calls[0];
    expect(id).toBe('row-1');
    expect(body).toEqual({ name: 'Barbecue Ribs', category: 'meat', profile_ids: ['p-smoky', 'p-pork'] });
    expect(JSON.stringify(body)).not.toMatch(/score|weight/);
  });

  it('DS2 Edit recomputes on the server and Confirm sends only the kept ids', async () => {
    setup();
    api.previewDraftProfiles.mockResolvedValue({ data: { profile_ids: ['p-pork'], keys: ['pork'], scores: { weight: 4 }, rules: [] } });
    api.confirmAgentDraft.mockResolvedValue({ data: { cluster_label_id: 'new', name: 'x', category: 'meat', entry: { ...entry, status: 'confirmed' } } });
    render(<AgentDraftsSection />);
    const card = await screen.findByTestId('draft-card');
    fireEvent.click(within(card).getByRole('button', { name: /edit/i }));
    fireEvent.click(within(card).getByLabelText(/from bbq/i));
    await waitFor(() => expect(api.previewDraftProfiles).toHaveBeenCalledWith(['p-pork']));
    await within(card).findByText('edited');
    expect(within(card).getByText(/Wt 4/)).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(api.confirmAgentDraft).toHaveBeenCalled());
    expect(api.confirmAgentDraft.mock.calls[0][1].profile_ids).toEqual(['p-pork']);
  });

  it('DS3 Reject flips the card to rejected', async () => {
    setup();
    api.rejectAgentDraft.mockResolvedValue({ data: { entry: { ...entry, status: 'rejected' } } });
    render(<AgentDraftsSection />);
    const card = await screen.findByTestId('draft-card');
    fireEvent.click(within(card).getByRole('button', { name: /reject/i }));
    await waitFor(() => expect(api.rejectAgentDraft).toHaveBeenCalledWith('row-1'));
    await waitFor(() => expect(screen.queryByTestId('draft-card')).toBeNull());
    const growing = screen.getByTestId('growing');
    expect(within(growing).getByText('rejected')).toBeTruthy();
  });

  it('DS4 Corpus Lookup shows only the typed food', async () => {
    setup();
    const { unmount } = render(<AgentDraftsSection match="Barbecue  Ribs" />);
    expect(await screen.findByTestId('agent-drafts-for-food')).toBeTruthy();
    unmount();
    render(<AgentDraftsSection match="pizza" />);
    await waitFor(() => expect(api.getAgentDrafts).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('agent-drafts-for-food')).toBeNull();
    expect(screen.queryByTestId('draft-card')).toBeNull();
  });

  it('DS5 approving a suggested attribute removes it from the list', async () => {
    setup([entry], [{ id: 'a-1', status: 'pending', attribute: 'dry rub', for_component_text: 'barbecue ribs', gap_submission_id: 'row-1', reason: 'spice crust', origin: 'pairit_agent', submitted_at: '', reviewed_at: null, review_notes: null }]);
    render(<AgentDraftsSection />);
    const box = await screen.findByTestId('suggested-attributes');
    await within(box).findByText('dry rub');
    fireEvent.click(within(box).getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(api.approveCorpusAttribute).toHaveBeenCalledWith('a-1'));
    await waitFor(() => expect(within(box).queryByText('dry rub')).toBeNull());
  });
});
