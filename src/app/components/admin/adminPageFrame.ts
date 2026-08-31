import type { CSSProperties } from 'react';

/**
 * The admin page frame: one definition of the outer chrome every QM Admin
 * page sits in.
 *
 * Before this existed, each page hand-wrote its own frame and they disagreed.
 * Measured on origin/main: p-6 md:p-10 paired with max-w-4xl (Health),
 * max-w-5xl (Dashboard, Matching Engine), max-w-6xl (Brand and Distributor
 * detail) and max-w-7xl (Brands, Chefs, Distributors, Brand Rules, Gap
 * Filler). That spread is why the gutters looked inconsistent from page to
 * page and why a table on one page stopped short of a table on another. A
 * per-page correction would have restored the same drift the moment the next
 * page was written, so the frame lives here and the pages reference it.
 *
 * Justin's ask: tables run full width with a consistent border buffer. So the
 * frame carries the buffer as padding and applies NO max width by default.
 */

/**
 * The ultrawide cap, as a single value in one place.
 *
 * null means no cap, which is the working answer from Chit (2026-08-31)
 * pending Moose's ruling: full width, fixed gutter, as Justin asked.
 *
 * There is a real open question behind this. On a 2560px display a six-column
 * table stretches the full panel, which pushes each row's actions a long way
 * from the identity of the row those actions apply to. That distance is the
 * same ingredient as the Team page defect, where an operator acted on a
 * control without carrying the target with it.
 *
 * To evaluate a cap, set this to a CSS length (for example '1600px') and
 * screenshot. Nothing else in the codebase changes, which is the point of
 * keeping it here rather than spread across eighteen files.
 */
export const ADMIN_PAGE_MAX_WIDTH: string | null = null;

/**
 * The consistent border buffer. Applied on all sides so a page's content
 * never sits flush against the shell.
 */
export const ADMIN_PAGE_FRAME = 'w-full p-6 md:p-10';

/**
 * Carries the cap when one is set, and is undefined when it is not, so the
 * default renders with no inline style at all.
 */
export const ADMIN_PAGE_FRAME_STYLE: CSSProperties | undefined = ADMIN_PAGE_MAX_WIDTH
  ? { maxWidth: ADMIN_PAGE_MAX_WIDTH, marginInline: 'auto' }
  : undefined;
