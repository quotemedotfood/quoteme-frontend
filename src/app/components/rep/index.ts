// Rep-facing components — shell + primitives (feat/rep-suite-fe).
// Pages are a separate subagent delivery; this barrel exports only primitives.

export { RepDesktopShell, RepNewspaperSidebar } from './RepDesktopShell';
export type {
  RepDesktopShellProps,
  RepNewspaperSidebarProps,
  RepSidebarMode,
  RepActiveTab,
} from './RepDesktopShell';

export { RepMatchStateBadge } from './RepMatchStateBadge';
export type { RepMatchStateBadgeProps, RepMatchState } from './RepMatchStateBadge';

export { CatalogConfirmBanner } from './CatalogConfirmBanner';
export type {
  CatalogConfirmBannerProps,
  CatalogConfirmBannerVariant,
} from './CatalogConfirmBanner';

// P0: LineCoverageDot/CoverageDot (CoverageDots.tsx), QuoteCoverageLabelRep,
// ItemsToConfirm, and RepCtaStrip were exported here only for the now-deleted
// old quote-triage view (RepIncomingQuotePage + its RepPricingOnlyView /
// RepReviewThreePanelDesktop / RepReviewMobileFallback sub-views). No other
// consumer imported them, so the files were removed along with the view.
