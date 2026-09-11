// Tests for normalizeLanderConfig — the boundary function that turns an
// unknown fetch body into a well-formed LanderConfig.
//
// This is the fix for a production bug: the BE returned
//   accepted_payload:       "chef_source"                        (a bare string)
//   accepted_content_types: ["application/pdf", "text/plain"]    (MIME types)
// and a bare `as LanderConfig` cast let that flow straight into gates written
// as array operations, which silently became String.prototype operations
// instead — wrong answers, no throw. These tests pin the exact bad payload
// plus the well-formed / malformed edges around it.
//
// Pure-logic exports only — no DOM, no render, no cleanup() needed.

import { describe, it, expect } from 'vitest';
import { normalizeLanderConfig } from './DistributorLanderPage';

describe('normalizeLanderConfig', () => {
  it('recovers from the exact bad payload seen in production', () => {
    const body = {
      distributor: { id: 'd1', name: 'Acme Foods', display_name: 'Acme' },
      branding: {
        logo_url: null,
        primary_hex: '#F2993D',
        secondary_hex: '#7FAEC2',
        custom_notes: null,
        quoteme_verbiage: null,
      },
      accepted_payload: 'chef_source',
      accepted_content_types: ['application/pdf', 'text/plain'],
    };

    const result = normalizeLanderConfig(body);

    // 'chef_source' is not a recognized payload type, so it is dropped and
    // the safe 'menu' fallback is used instead of an empty array.
    expect(result.accepted_payload).toEqual(['menu']);
    // MIME types are mapped through to the FE's short vocabulary.
    expect(result.accepted_content_types).toEqual(['pdf', 'text']);
    expect(result.distributor).toEqual({ id: 'd1', name: 'Acme Foods', display_name: 'Acme' });
  });

  it('passes a well-formed config through unchanged in substance', () => {
    const body = {
      distributor: { id: 'd2', name: 'Best Distributors', display_name: 'Best Co' },
      branding: {
        logo_url: 'https://example.com/logo.png',
        primary_hex: '#111111',
        secondary_hex: '#222222',
        custom_notes: 'Please include your rep name.',
        quoteme_verbiage: { header_trust_line: 'Trusted by chefs everywhere' },
      },
      accepted_payload: ['menu', 'order_guide'],
      accepted_content_types: ['text', 'pdf'],
    };

    expect(normalizeLanderConfig(body)).toEqual(body);
  });

  it('wraps a single-string accepted_payload into an array when recognized', () => {
    const body = {
      distributor: { id: 'd3', name: 'Third Co', display_name: 'Third' },
      branding: {
        logo_url: null,
        primary_hex: '#000',
        secondary_hex: '#fff',
        custom_notes: null,
        quoteme_verbiage: null,
      },
      accepted_payload: 'order_guide',
      accepted_content_types: 'text',
    };

    const result = normalizeLanderConfig(body);

    expect(result.accepted_payload).toEqual(['order_guide']);
    expect(result.accepted_content_types).toEqual(['text']);
  });

  it('falls back to safe defaults for an empty/garbage config', () => {
    const result = normalizeLanderConfig({
      distributor: {},
      branding: {},
      accepted_payload: ['unknown_type', 42, null],
      accepted_content_types: ['application/octet-stream', 'video/mp4'],
    });

    expect(result.accepted_payload).toEqual(['menu']);
    expect(result.accepted_content_types).toEqual(['text']);
    expect(result.distributor).toEqual({ id: '', name: '', display_name: '' });
    expect(result.branding).toEqual({
      logo_url: null,
      primary_hex: '',
      secondary_hex: '',
      custom_notes: null,
      quoteme_verbiage: null,
    });
  });

  it('handles null/undefined fields and a totally malformed body without throwing', () => {
    expect(() => normalizeLanderConfig(null)).not.toThrow();
    expect(() => normalizeLanderConfig(undefined)).not.toThrow();
    expect(() => normalizeLanderConfig('not an object')).not.toThrow();
    expect(() => normalizeLanderConfig(42)).not.toThrow();

    const result = normalizeLanderConfig({
      distributor: null,
      branding: undefined,
      accepted_payload: null,
      accepted_content_types: undefined,
    });

    expect(result).toEqual({
      distributor: { id: '', name: '', display_name: '' },
      branding: {
        logo_url: null,
        primary_hex: '',
        secondary_hex: '',
        custom_notes: null,
        quoteme_verbiage: null,
      },
      accepted_payload: ['menu'],
      accepted_content_types: ['text'],
    });
  });

  it('drops an array-valued quoteme_verbiage rather than passing it through as an object', () => {
    const result = normalizeLanderConfig({
      distributor: { id: 'd4', name: 'Four', display_name: 'Four' },
      branding: {
        primary_hex: '#123',
        secondary_hex: '#456',
        logo_url: null,
        custom_notes: null,
        quoteme_verbiage: ['not', 'a', 'record'],
      },
      accepted_payload: ['menu'],
      accepted_content_types: ['text'],
    });

    expect(result.branding.quoteme_verbiage).toBeNull();
  });

  it('dedupes accepted_content_types when both raw and mapped forms are present', () => {
    const result = normalizeLanderConfig({
      distributor: { id: 'd5', name: 'Five', display_name: 'Five' },
      branding: {
        primary_hex: '#123',
        secondary_hex: '#456',
        logo_url: null,
        custom_notes: null,
        quoteme_verbiage: null,
      },
      accepted_payload: ['menu'],
      accepted_content_types: ['application/pdf', 'pdf', 'text/plain'],
    });

    expect(result.accepted_content_types).toEqual(['pdf', 'text']);
  });
});
