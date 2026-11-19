// One retail location on the QM admin: the catalog card (shown, hidden, last
// load), the price rule and its warning when none is set, live or prospect,
// co-brand, a catalog set by id only, and a refused save showing the
// backend's reason.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const m = vi.hoisted(() => ({
  getAdminRetailLocation: vi.fn(),
  updateAdminRetailLocation: vi.fn(),
  uploadAdminRetailLocationLogo: vi.fn(),
  deleteAdminRetailLocationLogo: vi.fn(),
  getAdminRestaurantGroups: vi.fn(),
  createAdminRestaurantContact: vi.fn(),
  attachAdminPairitCode: vi.fn(),
  getAdminRetailLocations: vi.fn(),
  createAdminRetailLocation: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { RetailLocationDetail, loadDate } from './QMAdminRetailLocationDetail';
import { QMAdminRetailLocations } from './QMAdminRetailLocations';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const CATALOG_ID = '80fddae4-488e-4ad8-92d9-ec2bc8d26d20';
const catalog = (extra: Record<string, unknown> = {}) => ({
  id: CATALOG_ID, rows: 4269, wines_shown: 3120, wines_hidden: 1149, last_loaded_at: '2026-11-17T16:30:00.000Z',
  ...extra,
});
const store = (extra: Record<string, unknown> = {}) => ({
  id: 's1', name: 'Total Beverage', slug: 'total-beverage-westminster', address_line_1: '9359 Sheridan Blvd', address_line_2: null,
  city: 'Westminster', state: 'CO', zip: '80031', phone: null, website: null, status: 'prospect', live: false, co_branded: false,
  catalog_id: null, restaurant_group: null, created_at: '2026-11-17', logo_url: null, catalog: null, contacts: [], ...extra,
});

function show(s = store()) {
  m.getAdminRetailLocation.mockResolvedValue({ data: s });
  m.getAdminRestaurantGroups.mockResolvedValue({ data: [{ id: 'g1', name: 'Total Beverage Group', status: 'active', restaurant_count: 0, created_at: '' }] });
  render(<MemoryRouter><RetailLocationDetail locationId="s1" /></MemoryRouter>);
}

describe('RetailLocationDetail', () => {
  it('shows the catalog card: wines shown, rows hidden, and the last load date', async () => {
    show(store({ catalog_id: CATALOG_ID, catalog: catalog() }));
    const facts = within(await screen.findByTestId('catalog-facts'));
    expect(facts.getByText('3,120')).toBeTruthy();
    expect(facts.getByText('1,149')).toBeTruthy();
    expect(facts.getByText('4,269')).toBeTruthy();
    expect(facts.getByText(loadDate('2026-11-17T16:30:00.000Z'))).toBeTruthy();
    expect(facts.getByText(CATALOG_ID)).toBeTruthy();
  });

  it('says shoppers see the shelf price, with no choice and no x 1.5 warning', async () => {
    show(store({ catalog_id: CATALOG_ID, catalog: catalog() }));
    const facts = within(await screen.findByTestId('catalog-facts'));
    expect(facts.getByText('Shelf price, as given')).toBeTruthy();
    expect(screen.queryByLabelText('Price shoppers see')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.body.textContent).not.toContain('x 1.5');
  });

  it('marks a prospect live, and a live store back to prospect', async () => {
    show();
    await screen.findByText(/shoppers cannot open PairIt/);
    m.updateAdminRetailLocation.mockResolvedValue({ data: store({ status: 'active', live: true }) });

    fireEvent.click(screen.getByRole('button', { name: 'Mark live' }));

    await waitFor(() => expect(m.updateAdminRetailLocation).toHaveBeenCalledWith('s1', { status: 'active' }));
    await screen.findByText(/shoppers can open PairIt/);
    fireEvent.click(screen.getByRole('button', { name: 'Back to prospect' }));
    await waitFor(() => expect(m.updateAdminRetailLocation).toHaveBeenLastCalledWith('s1', { status: 'prospect' }));
  });

  it('sends co-brand as true or false, and says when there is no logo to show', async () => {
    show();
    m.updateAdminRetailLocation.mockResolvedValue({ data: store({ co_branded: true }) });

    fireEvent.click(await screen.findByLabelText('Co-branded'));

    await waitFor(() => expect(m.updateAdminRetailLocation).toHaveBeenCalledWith('s1', { co_branded: true }));
    await screen.findByText(/there is no logo yet/);
  });

  it('sets a catalog by its id only: a name is refused here and never sent', async () => {
    show();
    const input = await screen.findByLabelText('Catalog id');
    fireEvent.change(input, { target: { value: 'the Total Beverage file' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set catalog' }));
    expect((await screen.findByRole('alert')).textContent).toContain('A catalog id looks like');
    expect(m.updateAdminRetailLocation).not.toHaveBeenCalled();

    m.updateAdminRetailLocation.mockResolvedValue({ data: store({ catalog_id: CATALOG_ID, catalog: catalog() }) });
    fireEvent.change(input, { target: { value: ` ${CATALOG_ID} ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Set catalog' }));
    await waitFor(() => expect(m.updateAdminRetailLocation).toHaveBeenCalledWith('s1', { catalog_id: CATALOG_ID }));
    await screen.findByTestId('catalog-facts');
  });

  it('saves the store form with the group by id, and shows a refused save', async () => {
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Edit/ }));
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: ' 303-555-0100 ' } });
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'g1' } });
    m.updateAdminRetailLocation.mockResolvedValueOnce({ error: 'That group has a PairMe plan. A store cannot join it here.' });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect((await screen.findByRole('alert')).textContent).toContain('PairMe plan');
    expect(m.updateAdminRetailLocation).toHaveBeenCalledWith('s1', {
      name: 'Total Beverage', address_line_1: '9359 Sheridan Blvd', address_line_2: null, city: 'Westminster', state: 'CO',
      zip: '80031', phone: '303-555-0100', website: null, restaurant_group_id: 'g1',
    });
  });

  it('adds a contact through the store id and reads the store again', async () => {
    show();
    fireEvent.change(await screen.findByLabelText('Contact first name'), { target: { value: 'Chuck' } });
    fireEvent.change(screen.getByLabelText('Contact last name'), { target: { value: 'Owner' } });
    m.createAdminRestaurantContact.mockResolvedValue({ data: { id: 'c1' } });
    m.getAdminRetailLocation.mockResolvedValue({
      data: store({ contacts: [{ id: 'c1', first_name: 'Chuck', last_name: 'Owner', role: null, email: null, phone: null, is_primary: false }] }),
    });

    fireEvent.click(screen.getByRole('button', { name: /Add contact/ }));

    await waitFor(() => expect(m.createAdminRestaurantContact).toHaveBeenCalledWith('s1', { first_name: 'Chuck', last_name: 'Owner' }));
    expect(within(await screen.findByTestId('store-contacts')).getByText('Chuck Owner')).toBeTruthy();
  });
});

describe('RetailLocationDetail stickers', () => {
  it('attaches a blank sticker by its code and a spot name, and shows a refused one', async () => {
    show();
    const attach = (await screen.findByRole('button', { name: 'Attach sticker' })) as HTMLButtonElement;
    expect(attach.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Sticker code'), { target: { value: ' k7m2qx ' } });
    fireEvent.change(screen.getByLabelText('Sticker spot name'), { target: { value: ' Aisle 7, left ' } });
    m.attachAdminPairitCode.mockResolvedValueOnce({ error: 'That sticker is already on another store. Take it off there first.' });
    fireEvent.click(attach);

    await waitFor(() => expect(m.attachAdminPairitCode).toHaveBeenCalledWith('s1', 'k7m2qx', 'Aisle 7, left'));
    expect((await screen.findByTestId('sticker-note')).textContent).toContain('already on another store');

    m.attachAdminPairitCode.mockResolvedValueOnce({ data: { code: 'K7M2QX', name: 'Aisle 7, left', url: '', batch: null, attached_at: '', restaurant_id: 's1' } });
    fireEvent.click(attach);
    await waitFor(() => expect(screen.getByTestId('sticker-note').textContent).toContain('Sticker K7M2QX is now "Aisle 7, left"'));
    expect((screen.getByLabelText('Sticker code') as HTMLInputElement).value).toBe('');
  });
});

describe('RetailLocationDetail QR code', () => {
  const qr = {
    url: 'https://app.pairme.wine/q/total-bev-westminster',
    qr_png: 'data:image/png;base64,iVBORw0KGgo=',
    qr_svg: 'data:image/svg+xml;base64,PHN2Zy8+',
  };

  it('shows a live store its link, Copy, and PNG and SVG downloads named for the store', async () => {
    show(store({ status: 'active', live: true, pairit_url: qr.url, pairit_qr: qr }));
    const card = within(await screen.findByTestId('pairme-flow-card'));
    expect(card.getByText('PairIt link and QR code')).toBeTruthy();
    expect(card.getByTestId('pairme-flow-url').textContent).toContain(qr.url);
    expect((card.getByTestId('pairme-flow-qr') as HTMLImageElement).src).toBe(qr.qr_png);
    expect(card.getByTestId('pairme-flow-copy')).toBeTruthy();
    const png = card.getByTestId('pairme-flow-download') as HTMLAnchorElement;
    const svg = card.getByTestId('pairme-flow-download-svg') as HTMLAnchorElement;
    expect([png.textContent, png.getAttribute('href'), png.getAttribute('download')]).toEqual([' Download PNG', qr.qr_png, 'total-bev-westminster-qr.png']);
    expect([svg.getAttribute('href'), svg.getAttribute('download')]).toEqual([qr.qr_svg, 'total-bev-westminster-qr.svg']);
    expect(screen.queryByTestId('store-qr-pending')).toBeNull();
  });

  it('tells a prospect store to mark live to get the QR, and shows no code', async () => {
    show(store({ pairit_url: qr.url, pairit_qr: null }));
    expect((await screen.findByTestId('store-qr-pending')).textContent).toContain('Mark live to get the QR');
    expect(screen.queryByTestId('pairme-flow-card')).toBeNull();
  });
});

describe('QMAdminRetailLocations', () => {
  it('lists stores with live or prospect, and needs a name, city and state to add one', async () => {
    m.getAdminRetailLocations.mockResolvedValue({
      data: [store({ id: 's1' }), store({ id: 's2', name: 'Zeta Wines', status: 'active', live: true, catalog_id: CATALOG_ID })],
    });
    render(<MemoryRouter><QMAdminRetailLocations /></MemoryRouter>);

    expect(await screen.findByText('Zeta Wines')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Prospect')).toBeTruthy();

    const add = screen.getByRole('button', { name: /New store/ }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText('New store name'), { target: { value: 'Corner Shop' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Denver' } });
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'CO' } });
    expect(add.disabled).toBe(false);

    m.createAdminRetailLocation.mockResolvedValue({ error: 'Another account at this address already has that name' });
    fireEvent.click(add);
    await waitFor(() => expect(m.createAdminRetailLocation).toHaveBeenCalledWith({ name: 'Corner Shop', city: 'Denver', state: 'CO' }));
    expect((await screen.findByRole('alert')).textContent).toContain('already has that name');
  });
});
