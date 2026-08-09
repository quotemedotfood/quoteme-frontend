import { describe, it, expect } from 'vitest';
import { getBaroloRows, getBaroloTableData, BAROLO_VENUE } from './baroloSeed.js';

describe('baroloSeed', () => {
  it('parses the committed Barolo Grill fixture into ~1832 wine rows, zero network', () => {
    const rows = getBaroloRows();
    // Same count packages/pairing/src/parseWineList.test.js's own
    // `barolo: 1832` anti-divergence assertion holds parseWineList to.
    expect(rows.length).toBe(1832);
  });

  it('every row carries a boolean glass field (normalized from glass_price for pairingAdapter)', () => {
    const rows = getBaroloRows();
    expect(rows.every((r) => typeof r.glass === 'boolean')).toBe(true);
  });

  it('getBaroloTableData() feeds the same shape GET /v1/demo and GET /v1/t/:code do', async () => {
    const data = await getBaroloTableData();
    expect(data.venue).toEqual(BAROLO_VENUE);
    expect(Array.isArray(data.rows)).toBe(true);
    expect(data.rows.length).toBe(1832);
  });
});
