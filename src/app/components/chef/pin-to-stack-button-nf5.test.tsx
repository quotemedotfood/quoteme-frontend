// NF-5 regression: /chef/distributor/:id crashed at render with
// "Cannot read properties of undefined (reading 'find')".
//
// Root cause: GET /api/v1/chef/stack returns { stack: null } when the chef has
// no stack yet — a TRUTHY object with no `pins` key. PinToStackButton did
// `stackData?.pins.find(...)`, where the `?.` only guards stackData being
// nullish; for { stack: null } it evaluates stackData.pins (undefined) then
// .find → throws. Every stackless chef hit it.
//
// This renders the button with the exact bad shape; pre-fix it throws,
// post-fix it renders.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { PinToStackButton } from './PinToStackButton';

describe('NF-5: PinToStackButton tolerates a stackless { stack: null } response', () => {
  it('does not throw when stackData lacks a pins array', () => {
    const html = renderToStaticMarkup(
      createElement(PinToStackButton, {
        distributorId: 'dist-1',
        distributorName: 'Fish Guys',
        // The shape GET /chef/stack actually returns for a stackless chef.
        stackData: { stack: null } as never,
        onStackChange: () => {},
      }),
    );
    expect(html).toContain('button');
  });

  it('renders for a genuinely undefined (no stack) and a populated stack', () => {
    const undef = renderToStaticMarkup(
      createElement(PinToStackButton, {
        distributorId: 'dist-1', distributorName: 'Fish Guys',
        stackData: undefined, onStackChange: () => {},
      }),
    );
    expect(undef).toContain('button');

    const populated = renderToStaticMarkup(
      createElement(PinToStackButton, {
        distributorId: 'dist-1', distributorName: 'Fish Guys',
        stackData: { id: 's1', name: 'Main', status: 'active', location_id: 'l1', pins: [] } as never,
        onStackChange: () => {},
      }),
    );
    expect(populated).toContain('button');
  });
});
