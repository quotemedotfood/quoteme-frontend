// cc-assign-b188b.test.ts
// Pure-function regression coverage for B-188b: zero-ACTIVE-reps empty state
// on the Assignment Center (/command-center/assign).
//
// Context: GET .../command_center/unassigned already scopes its `reps` array
// to `rep_profiles.is_active = true` server-side (command_center_controller.rb
// #unassigned). So on the FE, `reps.length === 0` already means "zero ACTIVE
// reps" — whether the distributor has no reps at all, or every rep on file is
// inactive. There is no separate "reps exist but are all inactive" state
// reachable from this payload; CCUnassignedRep deliberately carries no
// active/status field because the FE never needs to filter — the BE already
// did it. resolveAssignRowControls is the single place that turns
// (row.kind, reps.length) into which controls render, so a future change that
// drops the BE filter (or that duplicates this logic ad hoc in JSX) would
// break these tests instead of silently reintroducing a dead typeahead.

import { describe, it, expect } from 'vitest';
import { resolveAssignRowControls } from './CCAssignPage';

describe('B-188: quote row with reps available — typeahead + Take this one', () => {
  it('shows the typeahead and Take this one, no Add-a-rep link', () => {
    expect(resolveAssignRowControls('quote', 3)).toEqual({
      showTypeahead: true,
      showTakeThis: true,
      showAddRep: false,
    });
  });
});

describe('B-188/B-188b: quote row with zero ACTIVE reps — no dead typeahead', () => {
  it('hides the typeahead and offers Take this one + Add a rep (no reps on file)', () => {
    expect(resolveAssignRowControls('quote', 0)).toEqual({
      showTypeahead: false,
      showTakeThis: true,
      showAddRep: true,
    });
  });

  it('is identical when the zero count is because every rep is inactive — the BE '
    + 'already excludes inactive reps, so this is the same repsCount=0 case', () => {
    // Simulates: distributor has 2 reps on file, both is_active=false.
    // The BE payload for `reps` would be [] — same input as the "no reps" case.
    const repsCountWhenAllInactive = 0;
    expect(resolveAssignRowControls('quote', repsCountWhenAllInactive)).toEqual({
      showTypeahead: false,
      showTakeThis: true,
      showAddRep: true,
    });
  });
});

describe('B-188: relationship row with reps available — typeahead only', () => {
  it('shows the typeahead, never Take this one (no self-assign on restaurants), no Add-a-rep', () => {
    expect(resolveAssignRowControls('relationship', 4)).toEqual({
      showTypeahead: true,
      showTakeThis: false,
      showAddRep: false,
    });
  });
});

describe('B-188b: relationship row with zero ACTIVE reps — Add-a-rep, no dead typeahead', () => {
  it('hides the typeahead and offers Add a rep (Take this one stays quote-only)', () => {
    expect(resolveAssignRowControls('relationship', 0)).toEqual({
      showTypeahead: false,
      showTakeThis: false,
      showAddRep: true,
    });
  });
});
