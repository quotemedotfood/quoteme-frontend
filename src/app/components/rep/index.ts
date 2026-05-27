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

export { LineCoverageDot, CoverageDot } from './CoverageDots';
export type { LineCoverageDotProps, CoverageDotProps, CoverageStrength } from './CoverageDots';

export { QuoteCoverageLabelRep } from './QuoteCoverageLabelRep';
export type { QuoteCoverageLabelRepProps } from './QuoteCoverageLabelRep';

export { CatalogConfirmBanner } from './CatalogConfirmBanner';
export type {
  CatalogConfirmBannerProps,
  CatalogConfirmBannerVariant,
} from './CatalogConfirmBanner';

export { ItemsToConfirm } from './ItemsToConfirm';
export type { ItemsToConfirmProps, ItemsToConfirmMode } from './ItemsToConfirm';

export { RepCtaStrip } from './RepCtaStrip';
export type { RepCtaStripProps, RepCtaFlowState } from './RepCtaStrip';
