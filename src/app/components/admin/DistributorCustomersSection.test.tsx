// @vitest-environment jsdom
//
// Admin walk 2026-10-29: the distributor customers table is collapsed by
// default with a count, pages 50 rows at a time when open, keeps search,
// shows ALL CAPS names with a capital per word, and links each name to the
// QM admin restaurant page by id.
//
// afterEach(cleanup) is explicit: vitest globals are off in this project.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DistributorCustomersSection, type DistributorCustomer } from './DistributorCustomersSection';

afterEach(cleanup);

function customers(n: number): DistributorCustomer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r-${i + 1}`,
    name: `Place ${i + 1}`,
    city: 'Denver',
    state: 'CO',
  }));
}

function renderSection(list: DistributorCustomer[]) {
  return render(
    <MemoryRouter>
      <DistributorCustomersSection customers={list} />
    </MemoryRouter>,
  );
}

describe('DistributorCustomersSection', () => {
  it('starts collapsed and shows the count', () => {
    renderSection(customers(1204));
    expect(screen.getByTestId('distributor-customers-count')).toHaveTextContent('(1,204)');
    expect(screen.getByTestId('distributor-customers-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByTestId('distributor-customer-row')).toHaveLength(0);
  });

  it('opens to one page of 50 rows and pages forward', () => {
    renderSection(customers(1204));
    fireEvent.click(screen.getByTestId('distributor-customers-toggle'));
    expect(screen.getAllByTestId('distributor-customer-row')).toHaveLength(50);
    expect(screen.getByTestId('distributor-customers-range')).toHaveTextContent('Showing 1 to 50 of 1,204');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('distributor-customers-range')).toHaveTextContent('Showing 51 to 100 of 1,204');
    expect(screen.getByText('Place 51')).toBeInTheDocument();
  });

  it('searches across every customer, not only the page shown', () => {
    renderSection(customers(1204));
    fireEvent.click(screen.getByTestId('distributor-customers-toggle'));
    fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: 'place 1200' } });
    const rows = screen.getAllByTestId('distributor-customer-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Place 1200');
  });

  it('links each name to the restaurant page by id and fixes only ALL CAPS names', () => {
    renderSection([
      { id: 'abc-1', name: 'LA FORET', city: null, state: null },
      { id: 'abc-2', name: 'McGregor', city: 'Boulder', state: 'CO' },
    ]);
    fireEvent.click(screen.getByTestId('distributor-customers-toggle'));
    expect(screen.getByRole('link', { name: 'La Foret' })).toHaveAttribute('href', '/qm-admin/restaurants/abc-1');
    expect(screen.getByRole('link', { name: 'McGregor' })).toHaveAttribute('href', '/qm-admin/restaurants/abc-2');
    expect(screen.queryByText('LA FORET')).not.toBeInTheDocument();
  });

  it('says so when there are no customers', () => {
    renderSection([]);
    expect(screen.getByTestId('distributor-customers-count')).toHaveTextContent('(0)');
    fireEvent.click(screen.getByTestId('distributor-customers-toggle'));
    expect(screen.getByText('No customers yet')).toBeInTheDocument();
  });
});
