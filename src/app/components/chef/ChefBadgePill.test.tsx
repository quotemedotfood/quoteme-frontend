// ChefBadgePill.test.tsx
//
// Chef-header regression (2026-07-29): ChefTopbar's fallback chain
// (`firstName || email.split('@')[0] || 'Chef'`) can resolve to the bare
// literal "Chef" when an authenticated chef/buyer/group_admin session has
// neither a first name nor a usable email. ChefBadgePill always prepends its
// own "Chef " honorific, so that fallback rendered as "Chef Chef ▾" in the
// topbar. This component now strips any leading "Chef" from `firstName`
// defensively, so the label can never double up regardless of what a caller
// passes in.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChefBadgePill } from './ChefBadgePill';

afterEach(() => {
  cleanup();
});

describe('ChefBadgePill - "Chef Chef" dedupe', () => {
  it('renders a single "Chef" prefix for a normal first name', () => {
    render(<ChefBadgePill firstName="Daniel" chefType="single" onClick={() => {}} />);
    expect(screen.getByText('Chef Daniel')).toBeInTheDocument();
  });

  it('does not double the prefix when firstName already resolves to the bare "Chef" fallback', () => {
    render(<ChefBadgePill firstName="Chef" chefType="single" onClick={() => {}} />);
    expect(screen.queryByText('Chef Chef')).toBeNull();
    expect(screen.getByText('Chef there')).toBeInTheDocument();
  });

  it('strips a leading "Chef" if a caller ever passes a name that already carries the honorific', () => {
    render(<ChefBadgePill firstName="Chef Daniel" chefType="single" onClick={() => {}} />);
    expect(screen.getByText('Chef Daniel')).toBeInTheDocument();
    expect(screen.queryByText('Chef Chef Daniel')).toBeNull();
  });

  it('multi-location label also dedupes the prefix', () => {
    render(
      <ChefBadgePill
        firstName="Chef"
        chefType="multi"
        currentLocationName="Downtown"
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Chef there · Downtown')).toBeInTheDocument();
  });
});
