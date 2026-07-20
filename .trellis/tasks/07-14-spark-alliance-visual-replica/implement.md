# Implementation Plan

## Working Rules

- Use Trellis channel `implement` workers for code changes and `check` workers for independent review.
- One worker owns one bounded visual slice. Briefs list editable files and forbid unrelated refactors, dependency additions, route/data contract changes, and deletion of user work.
- The main session reviews diffs and raw worker events, runs verification, and decides whether a slice advances.
- Before every visual edit iteration, read the latest persisted `visual-verdict`; after capture, write the new verdict before another edit.

## Baseline

1. Record the dirty worktree and existing test/build results.
2. Start Vite on fixed port 5180 and confirm the actual route/auth state.
3. Capture the current dashboard at 1402x1122 and 375x812 using an isolated non-production browser state.
4. Persist the initial dashboard verdict under `.omx/state/dashboard/ralph-progress.json`.

## Wave 1A: Dashboard Data Contract And Local Tokens

Editable scope:

- `frontend/src/utils/appHomeDashboard.ts`
- `frontend/src/utils/appHomeDashboard.test.ts`
- `frontend/src/pages/app/AppHome.vue`
- dashboard components added under `frontend/src/components/dashboard/`
- dashboard-only token rules in `frontend/src/style.css` or a colocated dashboard style surface
- `frontend/public/dashboard/`

Steps:

1. Lock the current six-stat contract, priority ordering, weekly categories, planning semantics, and error/unavailable behavior with focused tests.
2. Distinguish real, derived, unavailable, loading, and error values; remove plausible static statistics from operational cards.
3. Land `--dash-*` tokens and exact 1400/1100/768 responsive tracks.
4. Align hero, cards, work/efficiency/growth regions, 12-entry exploration grid, footer, and quick center to `6.png` and `7.png`.
5. Fix quick-center width, trigger size/inset, 2x2 reminders, recent visits, theme/top actions, Escape/focus behavior, and non-blocking outside click.
6. Extract only the stable boundaries listed in `design.md`; preserve all existing routes, data fetching, quick note behavior, and deep links.
7. Run focused tests, then screenshot/visual-verdict iterations until desktop and quick-center references score at least 90.

Rollback: if extraction obscures behavior or causes broad churn, retain the page-local implementation and land tokens/data/geometry first.

## Wave 1B: Shared Application Shell

Editable scope:

- `frontend/src/pages/app/AppLayout.vue`
- `frontend/src/components/CosmicBackground.vue` only if screenshot or performance evidence requires it
- truly global rules in `frontend/src/style.css`
- focused shell tests

Steps:

1. Align the 200px full-height sidebar and main-region 56px top bar.
2. Preserve every authenticated navigation destination, user menu, settings/feedback routes, and responsive access.
3. Remove duplicate/fixed dashboard identity values from the shell or bind them to the established source of truth.
4. Spot-check all authenticated routes at desktop and mobile sizes before accepting shell changes.

Rollback: isolate page-specific adjustments if a shared shell edit regresses non-dashboard pages.

## Wave 2: AI Assistant And Smart Schedule

- Use `DesingImage/starspark-helper/` and `DesingImage/starspark-schedule/` plus module docs.
- Preserve real AI streaming, conversation persistence, schedule CRUD, repeat expansion, reminders, and AI import.
- Verify loading, empty, active conversation/event, drawer, desktop, and mobile states.
- Require `visual-verdict >= 90` for canonical references.

## Wave 3: Wall, Shop, Health, Companion

- Use one Trellis channel slice per module to avoid shared-file conflicts.
- Preserve Supabase mutations/realtime/storage for wall/shop/health and local-first companion persistence.
- Verify list/detail/create states and responsive side panels shown in each reference set.
- Require `visual-verdict >= 90` per canonical state.

## Wave 4: Remaining Product And Public Surfaces

- Cover learning, legacy, talent, news, cocreate, settings/profile/feedback, and public landing routes.
- Where no full-page screenshot exists, follow the closest module tokens, global shell, product IA, and `.impeccable.md`; document the missing pixel-comparison source.
- Preserve public/auth route boundaries and current behavior.

## Check Worker Contract

Each check worker inspects the diff, source references, screenshots, responsive behavior, semantics, and touched tests. Clear defects may be fixed inside the declared scope. Reports list changed files, visual score evidence, functional verification, known baseline failures, and remaining risks.

## Completion

- All four waves accepted.
- All canonical states score at least 90.
- No new known errors in touched code.
- Full test/build evidence recorded.
- Durable conventions written back to `.trellis/spec/frontend/`.
- Changes committed in reviewable Lore-protocol commits without unrelated user files.
