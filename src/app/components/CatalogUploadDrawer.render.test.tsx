// CatalogUploadDrawer.render.test.tsx
//
// Real-render coverage for the CJ catalog-upload cluster:
//   (a) the file-picker accept list no longer advertises .xls (a Fish Guys
//       .xls upload previously reached the backend and errored)
//   (b) once the upload response lands, a live "Classifying N/M" readout
//       driven by polling replaces the blind "Uploading..." spinner while
//       AI category classification runs server-side
//   (c) the Brand column is no longer marked Required, matching how
//       Pack Size / Category (also required: false) are treated -- the
//       backend never enforces brand
//   (d) the upload success path is routed through the shared
//       useAsyncMutation hook, so onUploadComplete fires the instant the
//       200 lands, not only once the user dismisses the "Done" screen
//
// This project's vitest config does not set globals: true, so
// @testing-library/react's afterEach-based auto cleanup never registers --
// afterEach(cleanup) is required explicitly (see MatchDrawer.test.tsx).
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

const { uploadCatalogFile, getClassificationStatus } = vi.hoisted(() => ({
  uploadCatalogFile: vi.fn(),
  getClassificationStatus: vi.fn(),
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    uploadCatalogFile,
    getClassificationStatus,
  };
});

import { CatalogUploadDrawer } from './CatalogUploadDrawer';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeFile(name = 'catalog.csv') {
  return new File(['item_number,product_name\n1,Chicken Breast'], name, { type: 'text/csv' });
}

function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

describe('CatalogUploadDrawer', () => {
  describe('file-picker no longer advertises .xls', () => {
    it('accepts only .csv and .xlsx, not .xls', async () => {
      render(<CatalogUploadDrawer open={true} onOpenChange={() => {}} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      const accept = input.getAttribute('accept') || '';
      // Guard against both the literal ".xls" token and any accidental
      // reintroduction that keeps the extension but drops the boundary.
      expect(accept.split(',')).not.toContain('.xls');
      expect(accept).toBe('.csv,.xlsx');
    });

    it('drops the .xls callout from the support copy under the drop zone', async () => {
      render(<CatalogUploadDrawer open={true} onOpenChange={() => {}} />);
      // Exact match: proves the copy reads "CSV, XLSX" with no trailing
      // ", XLS" ever having been reintroduced.
      expect(await screen.findByText('Supports CSV, XLSX')).toBeInTheDocument();
    });
  });

  describe('Brand is no longer marked Required', () => {
    it('shows Brand in the pre-upload checklist without a Required badge', async () => {
      render(<CatalogUploadDrawer open={true} onOpenChange={() => {}} />);

      const brandLabel = await screen.findByText('Brand');
      const brandRow = brandLabel.closest('div');
      expect(brandRow).not.toBeNull();
      // Item Number / Product Name are still genuinely required and DO carry
      // the badge elsewhere on this same screen, so this only proves Brand
      // specifically lost it -- not that the whole checklist did.
      expect(within(brandRow as HTMLElement).queryByText('Required')).not.toBeInTheDocument();
      expect(screen.getByText('Item Number').closest('div')).toHaveTextContent('Required');
    });
  });

  describe('onUploadComplete fires on success, not on dismiss', () => {
    it('calls onUploadComplete the instant the 200 lands, before "Done" is clicked', async () => {
      uploadCatalogFile.mockResolvedValue({
        data: {
          id: 'cat-1',
          item_count: 12,
          message: '12 products imported',
          classification_status: 'complete',
        },
      });
      const onUploadComplete = vi.fn();

      render(
        <CatalogUploadDrawer open={true} onOpenChange={() => {}} onUploadComplete={onUploadComplete} />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      selectFile(input, makeFile());

      fireEvent.click(await screen.findByRole('button', { name: /Upload Catalog/i }));

      // The parent must already be notified before the "Done" screen is
      // even rendered -- this is the whole point of routing through
      // useAsyncMutation's onSuccess instead of handleClose.
      await waitFor(() => expect(onUploadComplete).toHaveBeenCalledWith('cat-1'));
      expect(onUploadComplete).toHaveBeenCalledTimes(1);

      expect(await screen.findByText(/Done: 12 Products Imported/)).toBeInTheDocument();
    });

    it('does not call onUploadComplete when the catalog comes back with zero items', async () => {
      uploadCatalogFile.mockResolvedValue({
        data: {
          id: 'cat-empty',
          item_count: 0,
          message: 'No products could be imported',
          classification_status: 'complete',
        },
      });
      const onUploadComplete = vi.fn();

      render(
        <CatalogUploadDrawer open={true} onOpenChange={() => {}} onUploadComplete={onUploadComplete} />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      selectFile(input, makeFile());

      fireEvent.click(await screen.findByRole('button', { name: /Upload Catalog/i }));

      await waitFor(() => expect(uploadCatalogFile).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('No products could be imported')).toBeInTheDocument();
      expect(onUploadComplete).not.toHaveBeenCalled();
    });
  });

  describe('live classification progress readout', () => {
    it('shows "Classifying N/M" driven by polling instead of a blind spinner', async () => {
      uploadCatalogFile.mockResolvedValue({
        data: {
          id: 'cat-2',
          item_count: 8,
          message: '8 products imported',
          classification_status: 'pending',
          classification_total: 8,
        },
      });
      getClassificationStatus.mockResolvedValue({
        data: { catalog_id: 'cat-2', status: 'classifying', progress: 3, total: 8, flagged_count: 0 },
      });

      render(<CatalogUploadDrawer open={true} onOpenChange={() => {}} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      selectFile(input, makeFile());

      fireEvent.click(await screen.findByRole('button', { name: /Upload Catalog/i }));

      // The real component polls on a 2s interval (matches
      // StartNewQuotePage/CatalogManagePage), so this waits for a real
      // tick rather than faking timers.
      await waitFor(() => expect(getClassificationStatus).toHaveBeenCalledWith('cat-2'), {
        timeout: 4000,
      });
      expect(await screen.findByText('Classifying 3/8', {}, { timeout: 4000 })).toBeInTheDocument();

      // Not "Done" yet -- classification hasn't reported complete.
      expect(screen.queryByText(/Done: 8 Products Imported/)).not.toBeInTheDocument();
    });

    it('flips to the Done screen once polling reports complete', async () => {
      uploadCatalogFile.mockResolvedValue({
        data: {
          id: 'cat-3',
          item_count: 5,
          message: '5 products imported',
          classification_status: 'pending',
          classification_total: 5,
        },
      });
      getClassificationStatus.mockResolvedValue({
        data: { catalog_id: 'cat-3', status: 'complete', progress: 5, total: 5, flagged_count: 0 },
      });

      render(<CatalogUploadDrawer open={true} onOpenChange={() => {}} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      selectFile(input, makeFile());

      fireEvent.click(await screen.findByRole('button', { name: /Upload Catalog/i }));

      expect(
        await screen.findByText(/Done: 5 Products Imported/, {}, { timeout: 4000 })
      ).toBeInTheDocument();
    });
  });
});
