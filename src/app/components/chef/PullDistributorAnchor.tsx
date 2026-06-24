// PullDistributorAnchor — persistent distributor context strip.
//
// Appears at the top of every pull-quote page so the chef always sees which
// distributor they're pulling against. Warm paper (#FBFAF7) background matches
// ChefEntryPage and preserves visual continuity across the pull flow.
//
// Props shape mirrors the distributor object the pull-quote API returns.
// When `distributor` is null/undefined (data not loaded yet), renders a
// neutral skeleton so layouts don't jump.
//
// Copy doctrine: calm, operational.
// BANNED: AI, intelligent, automated, platform, ecosystem, seamless.

import React from 'react';

export interface PullDistributorInfo {
  id: string;
  name: string;
  /** Whether the chef has a rep relationship with this distributor */
  affiliated: boolean;
  /** Number of products in the catalog */
  catalog_item_count?: number | null;
  /** ISO date string when catalog was last refreshed */
  catalog_refreshed_at?: string | null;
  rep?: {
    name: string;
    email: string;
    first_name?: string | null;
  } | null;
}

export interface PullDistributorAnchorProps {
  distributor: PullDistributorInfo | null;
  /** Called when the chef taps "Change" */
  onChangeDistributor?: () => void;
  /** Override link label; defaults to "Change" */
  changeLinkLabel?: string;
}

function formatRefreshed(isoStr: string | null | undefined): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function PullDistributorAnchor({
  distributor,
  onChangeDistributor,
  changeLinkLabel = 'Change',
}: PullDistributorAnchorProps) {
  // Skeleton while data loads
  if (!distributor) {
    return (
      <div className="w-full bg-[#FBFAF7] border-b border-[#F0EDE7] px-5 py-3 flex items-center gap-3">
        <div className="w-4 h-4 rounded bg-[#E8E4DE] animate-pulse" />
        <div className="h-3.5 w-32 bg-[#E8E4DE] rounded animate-pulse" />
      </div>
    );
  }

  const metaParts: string[] = [];
  if (distributor.catalog_item_count != null) {
    metaParts.push(`${distributor.catalog_item_count.toLocaleString()} items`);
  }
  const refreshed = formatRefreshed(distributor.catalog_refreshed_at);
  if (refreshed) {
    metaParts.push(`Updated ${refreshed}`);
  }

  return (
    <div className="w-full bg-[#FBFAF7] border-b border-[#F0EDE7] px-5 py-3">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* Left: distributor info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icon: small building mark */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9E9E9E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[#2B2B2B] truncate">
                {distributor.name}
              </span>

              {/* Affiliation pill — H-4: only show "Rep on file" when rep name+email
                  are actually populated. When affiliated but fields are blank, fall
                  through to the "No rep yet" pill so the chef knows to fill them in. */}
              {distributor.affiliated && distributor.rep?.name?.trim() && distributor.rep?.email?.trim() ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#2A5F6F] bg-[#EEF6F8] rounded-full px-2 py-0.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2A5F6F] shrink-0" />
                  Rep on file
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#9E9E9E] bg-[#F5F5F5] border border-[#E8E8E8] rounded-full px-2 py-0.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
                  No rep yet
                </span>
              )}
            </div>

            {/* Meta line: item count + last refresh */}
            {metaParts.length > 0 && (
              <p className="text-[11px] text-[#BDBDBD] mt-0.5 leading-none">
                {metaParts.join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Right: Change link */}
        {onChangeDistributor && (
          <button
            type="button"
            onClick={onChangeDistributor}
            className="text-xs text-[#9E9E9E] hover:text-[#4F4F4F] transition-colors shrink-0 underline underline-offset-2"
          >
            {changeLinkLabel}
          </button>
        )}
      </div>
    </div>
  );
}
