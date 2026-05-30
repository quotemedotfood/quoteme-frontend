// Chef-facing components — B1 deliverable (2026-05-19).
// Route wire-up pending A3 promotion to main.

export { CatalogStatusBadge } from './CatalogStatusBadge';
export type { CatalogStatusBadgeProps, CatalogStatus } from './CatalogStatusBadge';

export { ChefTabBar } from './ChefTabBar';
export type { ChefTabBarProps } from './ChefTabBar';

export { ChefTabDesktopShell } from './ChefTabDesktopShell';
export type { ChefTabDesktopShellProps } from './ChefTabDesktopShell';

export { ChefDistributorsTab } from './ChefDistributorsTab';
export type { ChefDistributorsTabProps } from './ChefDistributorsTab';

export { ChefDistributorsTabDesktop } from './ChefDistributorsTabDesktop';
export type { ChefDistributorsTabDesktopProps } from './ChefDistributorsTabDesktop';

// distributorsDemoData re-exports removed (W2-4 live-data wiring).
// ChefDistributorsTabDesktop still imports from the file directly (dead code, see its TODO).
// Do NOT delete distributorsDemoData.ts until ChefDistributorsTabDesktop is wired to live data.

export { StuckRecoveryScreen, MENU_DRAFT_KEY } from './StuckRecoveryScreen';
export type { StuckRecoveryScreenProps } from './StuckRecoveryScreen';

export { PullDistributorAnchor } from './PullDistributorAnchor';
export type { PullDistributorAnchorProps, PullDistributorInfo } from './PullDistributorAnchor';

export { ChefBadgePill } from './ChefBadgePill';
export type { ChefBadgePillProps, ChefType } from './ChefBadgePill';

export { ChefAccountDrawer } from './ChefAccountDrawer';
export type { ChefAccountDrawerProps } from './ChefAccountDrawer';

export { SidebarHelpInput } from './SidebarHelpInput';
export type { SidebarHelpInputProps } from './SidebarHelpInput';

export { HelpDrawer } from './HelpDrawer';
export type { HelpDrawerProps } from './HelpDrawer';

export { PinToStackButton } from './PinToStackButton';
export type { PinToStackButtonProps } from './PinToStackButton';
