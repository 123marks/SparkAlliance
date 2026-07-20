# Spark Alliance design-faithful full UI replica

## Goal

Rebuild the complete Spark Alliance frontend so that its authenticated application and public surfaces faithfully match the supplied design images while preserving existing routes, data behavior, and user workflows.

## Requirements

- Treat `DesingImage/` screenshots and adjacent module documentation as the visual source of truth.
- Treat `tasks/*-blueprints.md` and `tasks/*-design-tokens.md` as implementation specifications where available.
- Preserve the existing Vue 3 + TypeScript architecture, router contracts, Supabase integrations, local-first persistence, composables, and business behavior.
- Do not add application dependencies unless the user explicitly requests them.
- Reuse supplied bitmap assets and existing icon components instead of approximating distinctive artwork with generic gradients or emoji.
- Establish one coherent global shell while retaining module-specific layouts, accents, and domain imagery.
- Implement desktop, tablet, and mobile compositions with no horizontal overflow and no critical action removed.
- Provide semantic controls, visible focus states, keyboard reachability, reduced-motion support, useful loading/empty/error states, and at least 44px touch targets.
- Keep edits scoped by wave and preserve unrelated user changes in the dirty worktree.
- Use Trellis channel workers for implementation and independent checking.
- Run screenshot comparison after every visual iteration. Persist each verdict under `.omx/state/{scope}/ralph-progress.json` and continue until the score is at least 90.

## Delivery Waves

1. Global application shell and dashboard.
2. AI assistant and smart schedule.
3. Campus wall, shopping, health, and companion.
4. Learning, legacy/talent/news/cocreate/settings and public landing surfaces.

Each wave is independently implementable, reviewable, and visually verifiable. A later wave may reuse shared tokens and shell work from an earlier wave but must not silently change accepted page geometry.

## Acceptance Criteria

- [ ] The global shell matches the reference navigation, top bar, background, spacing, active states, and responsive behavior.
- [ ] Every reference-backed route contains the same major regions, content hierarchy, visual assets, and interaction states as its canonical design.
- [ ] The dashboard matches `DesingImage/starspark-dashboard/6.png` at 1402x1122 and the quick center matches `7.png` at 558x996, with `visual-verdict >= 90` for each required capture.
- [ ] Dashboard P0 contains the fixed shell, hero, six status cards, priority tasks, schedule, plan progress, and exploration entry points; P1 contains efficiency and growth regions; P2 ecosystem content from `5.png` does not block the `6.png` and `7.png` baseline.
- [ ] AI assistant and schedule routes match their supplied desktop/mobile references with `visual-verdict >= 90`.
- [ ] Wall, shop, health, and companion routes match their supplied reference states with `visual-verdict >= 90`.
- [ ] Remaining reference-backed authenticated and public routes match their supplied designs or documented token/blueprint intent with `visual-verdict >= 90` where a canonical screenshot exists.
- [ ] Existing navigation destinations, forms, data reads/writes, and key actions still work; visual work does not replace them with dead controls or static-only demos.
- [ ] Dashboard numbers, reminders, and recommendations use real state; unavailable data renders explicit loading, error, or actionable empty states instead of unlabelled mock values.
- [ ] Desktop 1402x1122, tablet 1024x768, and mobile 375x812 checks show no incoherent overlap, clipped text, hidden critical actions, or horizontal page scroll.
- [ ] Keyboard focus is visible and logical; icon-only controls have accessible names; reduced-motion disables non-essential motion.
- [ ] Focused regression tests pass, the frontend test suite is run, and the existing TypeScript build baseline is documented without attributing pre-existing failures to this task.
- [ ] Trellis implement/check workers report completion and the main session reviews their raw events before accepting each wave.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
