# Technical Design

## Architecture

Keep the existing Vue 3 application architecture. Route pages own composition, composables/utilities own data and behavior, and shared components own repeated visual or interaction patterns. Do not introduce a second state system, a parallel mock application, or a new animation dependency.

The dashboard already implements most required regions. Refine it rather than rebuilding it: first lock data semantics, then land tokens and responsive grids, then correct shell geometry, and only then extract stable component boundaries.

## Source Priority

For every page, inspect sources in this order:

1. Canonical full-page/state image.
2. Module README and interaction specification.
3. Blueprint and design-token document.
4. Existing working component behavior.
5. Page override and shared `.impeccable.md` defaults.
6. UI Pro Max/frontend-design advice.

When generic guidance conflicts with a screenshot, reproduce the screenshot unless doing so would break accessibility or existing behavior. Resolve accessibility conflicts with the smallest visual deviation possible.

## Global Shell

- Desktop target: a 200px-class sidebar spanning the full height and a 56px-class top bar covering the main content region.
- Main content reserves shell dimensions instead of sliding beneath fixed elements.
- Mobile replaces the wide sidebar with an accessible compact navigation pattern while retaining every destination.
- Background depth comes from supplied cosmic assets and the existing `CosmicBackground.vue`; decorative effects remain behind content and respect reduced motion.
- Use a small z-index scale for background, content, sticky shell, popovers/drawers, and transient feedback.
- Because shell changes affect every authenticated route, land dashboard-local geometry/tokens first and change `AppLayout.vue` as a separately reviewed slice.

## Dashboard Composition

The canonical desktop composition follows `6.png`: hero, six status cards, three-column work region, four-column efficiency region, growth/badges/inspiration/ranking region, 12-entry exploration grid, footer, and lower-right quick center.

Current behavior to preserve includes parallel Supabase aggregation, partial query degradation, quick-note autosave/clear/convert-to-task, deep links, count-up, the SVG execution ring, empty states, outside-click handling, and reduced-motion support.

Current semantics to correct include static focus metrics, fake planning percentages/ETAs, index-based schedule status, duplicated/fixed level data, AI refresh wired to inspiration switching, incorrect weekly execution categories, and silent fallback from failed queries to plausible zeros. Real, derived, demo, loading, error, and unavailable values must be distinguishable in the view model.

## Component Boundaries

Extract only after behavior is covered and the page geometry is stable:

- `DashboardHero`
- `DashboardStatStrip`
- `PriorityActionsCard`
- `TodayScheduleCard`
- `PlannerProgressCard`
- `ShoppingStatusCard`
- `QuickNoteCard`
- `WeeklyExecutionCard`
- `GrowthSummaryCard`
- `CampusHotRankCard`
- `DashboardExploreGrid`
- `StarQuickCenter`

`appHomeDashboard.ts` remains limited to types and pure adapters/derived values. Supabase IO remains in the page initially and may later move to a dedicated composable without changing child component contracts.

## Assets And Tokens

- Land the documented `--dash-*` variables and consume them instead of copying raw colors, gaps, radii, and timings.
- Prefer supplied transparent/cropped module assets already under `frontend/public/dashboard/`.
- Preserve aspect ratios and reserve dimensions with `width`/`height` or `aspect-ratio`.
- Use SVG or the project's existing icon components for generic controls; use supplied bitmap illustrations for distinctive branded imagery.
- Do not crop a whole screenshot into the UI as a fake implementation.
- Lazy-load below-fold imagery. Hero imagery may load eagerly.

## Responsive Strategy

- `>=1400px`: status 6 columns, work 3, efficiency 4, growth 4, exploration 6.
- `1100-1399px`: status 3x2, work 2, efficiency/growth 2x2, exploration 4.
- `768-1099px`: status 2x3, work 1, efficiency/growth 2x2, exploration 3.
- `<768px`: status 2x3, work/efficiency/growth 1, exploration 2; hero stacks vertically.
- Quick center: 56px trigger at 24px inset; panel width `min(320px, calc(100vw - 32px))` and max height 80vh.
- Use explicit tracks, `minmax(0, 1fr)`, bounded sizes, and wrapping so long text/loading content cannot resize or overflow the page.

## Interaction And Accessibility

- Use native `button`, `a`, `nav`, `main`, headings, labels, and inputs.
- All icon-only controls receive accessible names and 44px hit areas.
- Focus indicators remain visible on dark surfaces.
- State transitions take 150-300ms and animate transform/opacity only; continuous effects stop off-screen or under reduced motion.
- Quick center supports Escape, outside click, focus transfer on open, and focus return on close without a page-blocking transparent overlay.
- Loading above 300ms shows a geometry-matched skeleton; errors include recovery; empty states include a next action.

## Verification

For each page/state:

1. Start Vite on port 5180 using a deterministic non-production state.
2. Capture the exact reference viewport and at least one mobile viewport.
3. Run `visual-verdict` against the canonical image.
4. Persist JSON to `.omx/state/<scope>/ralph-progress.json` with score, pass/fail, reasoning, suggestions, and next actions.
5. If score is below 90, apply the next targeted visual edit and repeat before editing a different visual area.
6. Run focused tests after behavior changes and the full available suite at wave completion.

## Risk Controls

- Never revert unrelated dirty-worktree changes.
- Do not weaken auth guards or use production user data solely for screenshots.
- Record exact pre-existing test/build failures and reject new failures in touched code.
- Prefer the module's declared canonical full-page screenshot when references disagree, and record deliberate deviations in verdict state.
