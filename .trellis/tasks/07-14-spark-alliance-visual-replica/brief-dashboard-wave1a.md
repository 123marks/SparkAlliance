# Implement Brief: Dashboard Wave 1A

## Active Task

`.trellis/tasks/07-14-spark-alliance-visual-replica`

## Goal

Bring the existing dashboard implementation materially closer to `DesingImage/starspark-dashboard/6.png` and `7.png` without rebuilding working behavior. Establish a deterministic, development-only visual fixture route/state so the main session can capture repeatable screenshots without production credentials or writes.

## Required Work

1. Read the task manifests and all provided PRD/design/implementation files before editing.
2. Inspect current user modifications carefully and preserve them.
3. Fix or update focused tests so the real six-stat dashboard contract, action priority, weekly categories, and unavailable/error semantics are protected.
4. Introduce the smallest development-only visual fixture path needed for repeatable Dashboard rendering. It must be gated by `import.meta.env.DEV`, must not weaken production auth, must not make network writes, and must use explicit deterministic fixture data rather than plausible unlabelled production values.
5. Land documented `--dash-*` tokens and use them for Dashboard color, spacing, radius, type, and motion values.
6. Implement the documented responsive grid tiers at 1400, 1100, 768, and mobile widths.
7. Correct Dashboard-local geometry and semantics: hero padding/type, six status cards, priority color strips, schedule status logic, planning values, weekly execution categories, AI refresh behavior, 12-entry exploration grid, and quick-center 56/24/320 sizing with mobile-safe width.
8. Preserve parallel Supabase reads, partial degradation, quick-note autosave/clear/convert behavior, deep links, count-up, SVG ring, empty states, outside-click handling, and reduced-motion support.
9. Improve quick-center Escape/focus-return semantics and avoid a page-blocking transparent overlay.
10. Extract components only when it reduces real complexity without obscuring behavior. A smaller verified diff is preferred over a broad rewrite.

## Editable Scope

- `frontend/src/pages/app/AppHome.vue`
- `frontend/src/utils/appHomeDashboard.ts`
- `frontend/src/utils/appHomeDashboard.test.ts`
- `frontend/src/style.css`
- `frontend/src/router/index.ts` only for a strictly development-only visual route
- new Dashboard components or visual fixture files under `frontend/src/components/dashboard/` or `frontend/src/pages/dev/`
- `frontend/public/dashboard/` only when wiring existing supplied assets
- focused tests for the touched behavior

## Forbidden Actions

- Do not edit `AppLayout.vue` or `CosmicBackground.vue` in this slice.
- Do not add dependencies.
- Do not remove or bypass production authentication.
- Do not create or use a real Supabase test account.
- Do not replace live behavior with a static screenshot or dead mock page.
- Do not revert unrelated dirty-worktree changes.
- Do not edit other modules.
- Do not commit or push.

## Validation

Run from `frontend/`:

```powershell
npx vitest run src/utils/appHomeDashboard.test.ts
npm run test
npm run build
```

The repository has a known pre-existing baseline of 49 passed, 1 failed, 39 todo and 32 TypeScript build errors. Report exact current output and identify any new errors in touched files; do not claim a green full build unless it is actually green.

Also report the development-only fixture URL and the deterministic state it renders so the main session can capture 1402x1122, 558x996, and 375x812 screenshots.

## Completion Report

List changed files, preserved behavior, tests/build evidence, fixture URL, remaining visual gaps, and any shared-shell issues deferred to Wave 1B.
