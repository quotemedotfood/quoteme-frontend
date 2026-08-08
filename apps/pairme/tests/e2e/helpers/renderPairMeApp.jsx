import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import PairMeApp from '../../../src/routes.jsx';

/**
 * Renders the whole app the way a browser would land on it, plus a hidden
 * probe that surfaces the current router pathname via a data-testid so
 * specs can assert "which screen/path are we on" without reaching into
 * react-router internals. PairMeApp itself never exposes location, so this
 * is test-only infra, not app code.
 */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="pm-test-location" style={{ display: 'none' }}>{location.pathname}</div>;
}

export function renderPairMeApp(initialPath = '/') {
  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationProbe />
      <PairMeApp />
    </MemoryRouter>
  );
  return {
    ...view,
    currentPath: () => screen.getByTestId('pm-test-location').textContent,
  };
}
