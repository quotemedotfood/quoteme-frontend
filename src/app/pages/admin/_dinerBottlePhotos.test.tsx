// A DINER'S PHOTOS OF THE BOTTLE LIST on the QM admin restaurant page and the
// Bottle list photos page (Moose 11-12). Pins against the QuoteMe contract
// (spec/requests/api/v1/admin/restaurant_diner_bottle_photos_spec.rb):
//   F1 the restaurant block shows only when the restaurant has photos waiting
//   F2 a set shows its thumbnails, page count and date, with exactly the
//      buttons "Use as wine list" and "Discard"
//   F3 Use as wine list posts .../use for THIS restaurant and row id, then
//      says the list is being read; a refusal shows the server's words
//   F4 Discard asks first, and posts nothing when the admin says no
//   F5 the queue page lists every restaurant's sets, linked by restaurant id
//   F6 each set names what the diner photographed (kind, QuoteMe #827):
//      bottle_list, glass_list, wine_list; missing or unknown reads Bottle list
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const m = vi.hoisted(() => ({
  getRestaurantBottleListPhotos: vi.fn(),
  getBottleListPhotoQueue: vi.fn(),
  takeBottleListPhotosAsWineList: vi.fn(),
  discardBottleListPhotos: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { DinerBottlePhotosSection } from './_dinerBottlePhotos';
import { QMAdminBottleListPhotos } from './QMAdminBottleListPhotos';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

const row = (over: Record<string, unknown> = {}) => ({
  menu_id: 'm-1', restaurant_id: 'r-madeline', restaurant_name: 'The Madeline', kind: 'bottle_list',
  pages: 2, received_at: '2026-11-12T19:31:00Z', sent_at: '2026-11-12T19:30:00Z', screen: '/wines',
  signed_in: false, page_urls: ['https://x.example/p1', 'https://x.example/p2'], ...over,
});

const section = () => screen.queryByRole('region', { name: 'Diner photos of the bottle list' });

function renderSection() {
  return render(<MemoryRouter><DinerBottlePhotosSection restaurantId="r-madeline" /></MemoryRouter>);
}

describe('restaurant page block', () => {
  it('F1 shows nothing when no photos are waiting, or when the read fails', async () => {
    m.getRestaurantBottleListPhotos.mockResolvedValue({ data: { photos: [] } });
    renderSection();
    await waitFor(() => expect(m.getRestaurantBottleListPhotos).toHaveBeenCalledWith('r-madeline'));
    expect(section()).toBeNull();
    cleanup();

    m.getRestaurantBottleListPhotos.mockResolvedValue({ error: 'Forbidden', status: 403 });
    renderSection();
    await waitFor(() => expect(m.getRestaurantBottleListPhotos).toHaveBeenCalledTimes(2));
    expect(section()).toBeNull();
  });

  it('F2 shows thumbnails, the page count, the date and the two buttons', async () => {
    m.getRestaurantBottleListPhotos.mockResolvedValue({ data: { photos: [row()] } });
    renderSection();
    const block = await screen.findByRole('region', { name: 'Diner photos of the bottle list' });
    const set = within(block).getByTestId('bottle-list-photo-set');
    expect(within(set).getAllByRole('img').map((i) => i.getAttribute('src'))).toEqual(['https://x.example/p1', 'https://x.example/p2']);
    expect(set).toHaveTextContent('2 pages');
    expect(set).toHaveTextContent('Nov 12, 2026');
    expect(within(set).getAllByRole('button').map((b) => b.textContent)).toEqual(['Use as wine list', 'Discard']);
  });

  it('F6 names what the diner photographed, from the kind', async () => {
    m.getRestaurantBottleListPhotos.mockResolvedValue({ data: { photos: [
      row({ menu_id: 'm-1', kind: 'bottle_list' }),
      row({ menu_id: 'm-2', kind: 'glass_list' }),
      row({ menu_id: 'm-3', kind: 'wine_list' }),
      row({ menu_id: 'm-4', kind: 'something_new' }),
    ] } });
    renderSection();
    await screen.findByRole('region', { name: 'Diner photos of the bottle list' });
    expect(screen.getAllByTestId('bottle-list-photo-kind').map((k) => k.textContent))
      .toEqual(['Bottle list:', 'By the glass list:', 'Wine list:', 'Bottle list:']);
  });

  it('F3 Use as wine list posts for this restaurant and row, then says it is being read', async () => {
    m.getRestaurantBottleListPhotos.mockResolvedValue({ data: { photos: [row()] } });
    m.takeBottleListPhotosAsWineList.mockResolvedValue({ data: { menu_id: 'intake-1', status: 'extracting', pages: 2 } });
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Use as wine list' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Reading as the wine list');
    expect(m.takeBottleListPhotosAsWineList).toHaveBeenCalledWith('r-madeline', 'm-1');
    expect(screen.queryByRole('button', { name: 'Use as wine list' })).toBeNull();
  });

  it("F3 shows the server's words when Use is refused, and keeps the buttons", async () => {
    m.getRestaurantBottleListPhotos.mockResolvedValue({ data: { photos: [row()] } });
    m.takeBottleListPhotosAsWineList.mockResolvedValue({ error: 'These photos are HEIC, which the reader cannot open.', error_code: 'HEIC_NOT_READABLE', status: 422 });
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Use as wine list' }));

    expect(await screen.findByRole('status')).toHaveTextContent('These photos are HEIC');
    expect(screen.getByRole('button', { name: 'Use as wine list' })).toBeInTheDocument();
  });

  it('F4 Discard asks first and posts nothing on no; on yes it posts and says so', async () => {
    m.getRestaurantBottleListPhotos.mockResolvedValue({ data: { photos: [row()] } });
    m.discardBottleListPhotos.mockResolvedValue({ data: { menu_id: 'm-1', discarded: true } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(m.discardBottleListPhotos).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Discarded.');
    expect(m.discardBottleListPhotos).toHaveBeenCalledWith('r-madeline', 'm-1');
  });
});

describe('Bottle list photos page', () => {
  it("F5 lists every restaurant's sets in the server's order, each linked by restaurant id", async () => {
    m.getBottleListPhotoQueue.mockResolvedValue({ data: { photos: [
      row({ menu_id: 'm-2', restaurant_id: 'r-other', restaurant_name: 'Elsewhere', pages: 1 }),
      row(),
    ] } });
    render(<MemoryRouter><QMAdminBottleListPhotos /></MemoryRouter>);

    await waitFor(() => expect(screen.getAllByTestId('bottle-list-photo-set')).toHaveLength(2));
    const [first, second] = screen.getAllByTestId('bottle-list-photo-set');
    expect(within(first).getByRole('link', { name: 'Elsewhere' }).getAttribute('href')).toBe('/qm-admin/restaurants/r-other');
    expect(first).toHaveTextContent('1 page');
    expect(within(second).getByRole('link', { name: 'The Madeline' }).getAttribute('href')).toBe('/qm-admin/restaurants/r-madeline');
  });

  it('says so when nothing is waiting', async () => {
    m.getBottleListPhotoQueue.mockResolvedValue({ data: { photos: [] } });
    render(<MemoryRouter><QMAdminBottleListPhotos /></MemoryRouter>);
    expect(await screen.findByText('No photos waiting.')).toBeInTheDocument();
  });
});
