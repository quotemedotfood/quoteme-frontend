/**
 * UseDistributorForQuoteModal
 *
 * Confirmation modal that fires when a chef taps "Use for a quote" on an
 * AREA_DISTRIBUTORS row in the Distributors tab.
 *
 * Two variants:
 *   variant="mobile"  — bottom sheet (default)
 *   variant="desktop" — centered card
 *
 * Two content branches keyed off distributor.affiliated:
 *   affiliated (true/undefined) — locked copy only
 *   unaffiliated (false)        — appends catalog-only disclaimer
 *
 * No tap-outside dismiss — chef must Continue or Cancel.
 *
 * V3 spec ref: Part 5 (cross-distributor quote framing, locked copy).
 * Source: designs/handoff/source/screens-tabs.jsx — Opus c11 lock (May 18) Q4.
 *
 * Wire-up (added by future B1 integration):
 * const [modalDist, setModalDist] = useState(null);
 * <UseDistributorForQuoteModal
 *   distributor={modalDist}
 *   onClose={() => setModalDist(null)}
 *   onContinue={() => { setModalDist(null); navigate('/chef/entry'); }}
 *   variant="mobile" // or "desktop"
 * />
 */

import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../ui/utils';

export interface DistributorForModal {
  short: string;
  name: string;
  scope: string;
  items: number | string;
  updated: string;
  affiliated?: boolean;
}

export interface UseDistributorForQuoteModalProps {
  distributor: DistributorForModal | null;
  onClose: () => void;
  onContinue: () => void;
  variant?: 'mobile' | 'desktop';
}

export function UseDistributorForQuoteModal({
  distributor,
  onClose,
  onContinue,
  variant = 'mobile',
}: UseDistributorForQuoteModalProps) {
  if (!distributor) return null;

  const unaffiliated = distributor.affiliated === false;
  const isDesktop = variant === 'desktop';

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      // Backdrop — click is explicitly a no-op (no tap-outside dismiss).
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(31,26,20,.42)',
      }}
    >
      {/* Card — stop propagation so interior clicks don't bubble to backdrop */}
      <div
        className="bg-white"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isDesktop ? 520 : 360,
          marginBottom: isDesktop ? 'auto' : 0,
          marginTop: isDesktop ? 'auto' : 0,
          borderRadius: isDesktop
            ? 'var(--qm-radius-xl)'
            : 'var(--qm-radius-lg) var(--qm-radius-lg) 0 0',
          boxShadow: '0 -8px 32px rgba(31,26,20,.18)',
        }}
      >
        {/* Body */}
        <div className={isDesktop ? 'px-7 pt-7 pb-6' : 'px-5 pt-6 pb-5'}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>
            NEW QUOTE THREAD
          </div>
          <h2
            className="serif font-semibold ink mt-1.5"
            style={{ fontSize: isDesktop ? 22 : 19, lineHeight: 1.2 }}
          >
            Building a new quote with {distributor.short}.
          </h2>
          <p
            className={cn(
              'ink-soft leading-relaxed mt-2.5',
              isDesktop ? 'text-[13.5px]' : 'text-[13px]',
            )}
          >
            This stays a separate quote thread from your existing distributors. Continue?
          </p>

          {/* Unaffiliated disclaimer */}
          {unaffiliated && (
            <div
              className="mt-4 px-3.5 py-3 rounded-md"
              style={{
                background: 'var(--qm-warm-paper)',
                border: '1px solid var(--qm-soft-line)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    marginTop: 6,
                    borderRadius: 999,
                    background: 'var(--qm-warning)',
                    flexShrink: 0,
                  }}
                />
                <div className="text-[12px] ink-soft leading-relaxed">
                  <span className="ink">{distributor.short}</span> doesn&apos;t have a rep account
                  on QuoteMe yet. We&apos;ll match against their catalog, but prices won&apos;t
                  reflect rep-negotiated rates until they connect.
                </div>
              </div>
            </div>
          )}

          {/* Operational meta — what the chef is committing to */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11.5px]">
            <div>
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>
                CATALOG
              </div>
              <div className="ink mt-0.5 num">{distributor.items} items</div>
              <div className="ink-faint num">updated {distributor.updated}</div>
            </div>
            <div>
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>
                COVERAGE
              </div>
              <div className="ink mt-0.5">{distributor.scope}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex flex-col gap-2',
            isDesktop ? 'px-7 pb-7' : 'px-5 pb-5',
          )}
          style={{ borderTop: '1px solid var(--qm-soft-line)', paddingTop: 14 }}
        >
          <button onClick={onContinue} className="qm-btn qm-btn-orange qm-btn-full">
            Continue <ArrowRight size={16} color="white" />
          </button>
          <button onClick={onClose} className="qm-btn qm-btn-text qm-btn-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default UseDistributorForQuoteModal;
