# Wave 2 Research: Helper and Schedule

## Scope And Source Priority

This inventory records the UTF-8 document review and visual inspection of the Helper and Schedule design directories. It is not a `visual-verdict` score because no generated implementation screenshot was available.

Resolve conflicts in this order: current route/product architecture; module README behavior; canonical full-page references; `tasks/` blueprints/tokens; supporting asset boards. Readability, accessibility, data integrity, and reduced motion override decorative fidelity.

## Canonical References

### Spark Helper

| File | Pixels | Page/state and hierarchy |
| --- | ---: | --- |
| `DesingImage/starspark-helper/1.png` | 1672x941 | Expanded Xiaoyu: app sidebar, conversation rail, response/composer, status rail, overlay |
| `DesingImage/starspark-helper/2.png` | 1672x941 | Default reading: same four layers, code answer primary, status visible, Xiaoyu collapsed |

Use `2.png` as the default desktop reference. `1.png` defines only the on-demand expanded state.

### Smart Schedule

| File | Pixels | Page/state and hierarchy |
| --- | ---: | --- |
| `DesingImage/starspark-schedule/1.png` | 1672x941 | Dashboard: hero/stats/rhythm, timeline/pending work, 300px rail, four bottom actions |
| `DesingImage/starspark-schedule/4.png` | 735x962 | Create/edit event modal; implementation target is 520px wide on desktop |

### Spark Planner

| File | Pixels | Page/state and hierarchy |
| --- | ---: | --- |
| `DesingImage/starspark-schedule/schedule-planner.png` | 1578x996 | Overview: hero, metrics, goal map, milestones, weekly plan, AI advice, rail, actions |
| `schedule-planner-main/1.png` | 1586x992 | Create goal, AI decomposition, attachments, reward/progress preview |
| `schedule-planner-main/2.png` | 1586x992 | Goal detail, phase route, tasks, progress, trend, AI advice |
| `schedule-planner-main/3.png` | 1586x992 | History/review, monthly summary, achievements, streak |
| `schedule-planner-main/4.png` | 1586x992 | Goal preview and project-chat share drawer |

Planner references `5.png` through `10.png` are 1672x941 cosmic backgrounds, not page states. All abbreviated paths in this document are relative to `DesingImage/starspark-schedule/`.

### Spark Tarot

| File | Pixels | Page/state |
| --- | ---: | --- |
| `schedule-card.png` | 1672x941 | Overview dashboard |
| `schedule-card-main/1.png` | 1448x1086 | Module home, question, insight, deck, energy/history |
| `schedule-card-main/2.png` | 1448x1086 | Spread/draw interaction |
| `schedule-card-main/3.png` | 1448x1086 | Three-card reveal and reading |
| `schedule-card-main/4.png` | 1448x1086 | Star resonance |
| `schedule-card-main/5.png` | 1448x1086 | Inspiration workshop |
| `schedule-card-main/6.png` | 1448x1086 | Energy diary |
| `schedule-card-main/7.png` | 1448x1086 | Tarot community |
| `schedule-card-main/8.png` | 1448x1086 | Profile, collection, growth |
| `schedule-card-main/9.png` | 1505x945 | Immersive draw start |
| `schedule-card-main/10.png` | 1486x949 | Card selection confirmation |

The core Tarot journey is `1 -> 9 -> 10 -> 2 -> 3`; references `4-8` are secondary ecosystem pages.

## Visual Tokens

### Shared Foundation

- Deep blue-black page background with restrained violet nebula layers.
- Primary interaction `#7c3aed`; secondary interaction `#3b82f6`.
- Green, amber, orange, red, pink, and cyan are semantic accents only.
- Dark translucent glass surfaces, 1px violet/blue borders, controlled glow.
- Product type stack: `Inter, PingFang SC, sans-serif`.
- Glow must not reduce code, date, time, task, or deadline legibility.

### Helper

- General cards: 14-18px radius; code cards: 12px radius.
- Code: 13-14px, line-height 1.6, darker surface than normal messages.
- Violet-to-blue primary buttons; transparent glass secondary pills.
- Focus order: answer/code, current conversation, status, background.
- Xiaoyu is the primary character/motion asset; other motion remains subdued.

### Schedule

| Role | Value |
| --- | --- |
| Course / exam / task | `#3b82f6` / `#f97316` / `#7c3aed` |
| Life / reminder / holiday | `#10b981` / `#f59e0b` / `#ec4899` |
| Priority low/normal/high/urgent | `#10b981` / `#3b82f6` / `#f97316` / `#ef4444` |
| Timeline hour / event minimum | 60px / 32px |
| Event stripe / radius | 3px / 8px |
| Right rail | 300px |
| Desktop modal | 520px width, 20px radius |
| Hero/stat type | 20px/700 and 24px/700 |

Planner inherits violet/blue glass surfaces and reserves gold for rewards, badges, and milestones. Tarot adds gold card frames and magenta/violet ritual energy. Sample and centralize exact Tarot gold/frame colors from assets; do not estimate them independently per page.

## Responsive Breakpoints

### Helper

The Helper README has no breakpoint table. Use the current implementation-aligned contract:

| Viewport | Conversation rail | Status rail | Main behavior |
| --- | --- | --- | --- |
| `>=1501px` | 260px | 320px | Full four-layer desktop layout |
| `1321-1500px` | 220px | 280px | Compressed desktop layout |
| `769-1320px` | 200px | Hidden or drawer | Main answer retains priority |
| `<=768px` | Off-canvas drawer | Drawer/tab | Main conversation occupies viewport |

- Mobile Xiaoyu uses `min(340px, calc(100vw - 32px))` as a bottom/floating panel.
- Mode controls may scroll inside their strip; the page must not scroll horizontally.
- The composer remains reachable above safe areas and must not be covered by Xiaoyu.

### Schedule, Planner, And Tarot

| Viewport | Main area | Right rail | Bottom cards | Modal/panel |
| --- | --- | --- | --- | --- |
| `>=1300px` | Full timeline | Fixed 300px | Four columns | 520px modal |
| `1000-1299px` | Full timeline | Drawer | 2x2 | 520px modal |
| `768-999px` | Single column | Hidden/drawer | 2x2 | Full screen |
| `<768px` | Simplified timeline | Hidden/drawer | One column | Full screen |

Planner and Tarot inherit the integrated Schedule shell. Below 1000px, auxiliary rails become drawers or bottom sheets. Below 768px, milestone routes and card decks become step-based or single-card carousels rather than unreadably scaled desktop compositions.

## Required Interactions

### Helper

- Create, search, Escape-clear, switch, rename, pin, archive, clone, export, and delete conversations.
- Mode switching preserves unsent input and affects later messages.
- Support streaming, thinking/loading, upload progress, retry, and failure cards.
- Support Markdown, tables, lists, quotes, highlighted code, copy, expand, and download.
- Provide 3-5 contextual follow-ups and prevent duplicate submission.
- Deep-link schedule, learning, saved-content, and growth records.
- Expand/collapse/reopen Xiaoyu; reduced motion stops floating and rotation.

### Smart Schedule

- Switch day/week/month views with synchronized date navigation.
- Empty time slots open prefilled event forms.
- Events support view, edit, delete, send to Planner, and share to Campus Wall.
- Dragging provides lift, placeholder, and conflict feedback.
- AI import produces an editable structured preview before persistence.
- Conflicts appear in both timeline and form.

### Planner

- Create a goal, select type/importance, preview AI decomposition, attach evidence, validate, and begin.
- Expand phases, complete tasks, and update overall progress synchronously.
- Upload results and optionally request AI review.
- AI re-decomposition preserves version history and comparison.
- Send selected tasks to Schedule and share goals to selected project chats.

### Tarot

- Accept a question; support automatic and pointer/touch draw, select/reselect, reveal, and primary-card switching.
- Record mood, show history, and convert interpretations into editable Planner/Schedule drafts.
- Display a persistent reflection-only disclaimer; Tarot must not replace serious decisions.

All generated schedule, goal, or Tarot-derived actions require loading, failure recovery, editable review, and explicit confirmation. Never write unconfirmed generation directly to user data.

## Conflict Decisions

1. Preserve `/app/schedule` and `SmartSchedule.vue`; do not add top-level Planner or Tarot routes.
2. Screenshot global navigation is context, not content to duplicate inside Planner or Tarot.
3. Planner full-page references define internal hierarchy. In Smart Schedule they may use a wide drawer or main-content replacement, but never a second app shell.
4. Tarot local navigation becomes tabs or a drawer on small screens.
5. Schedule `1.png` defines dashboard direction while existing day/week/month behavior remains mandatory.
6. Schedule `4.png` defines only the event form.
7. Helper `2.png` is default; `1.png` is the expanded overlay state.
8. Planner references `5-10` are backgrounds, not UI targets.
9. The core Tarot draw journey takes priority over secondary Tarot ecosystem pages.
10. Readability, keyboard access, reduced motion, and non-overlap override particles, magic circles, trails, and glow.

## Visual Acceptance

### Layout And Fidelity

- [ ] Helper preserves app shell, conversation rail, reading area, composer, and optional status/Xiaoyu layer without overlap.
- [ ] Schedule preserves hero, timeline, semantic events, rail, and bottom actions on desktop.
- [ ] Planner overview/create/detail/history/share match canonical information hierarchy.
- [ ] Tarot has distinct home, ritual start, selection, spread, and result states.
- [ ] Local module navigation is not duplicated as global navigation.
- [ ] Backgrounds remain subordinate to code, dates, times, tasks, and deadlines.
- [ ] Glass, borders, radii, semantic colors, and icon treatment are consistent.
- [ ] Final icons use a coherent asset family, not emoji placeholders.

### States, Accessibility, And Robustness

- [ ] Default, hover, active, selected, loading, empty, error, disabled, and success states exist where relevant.
- [ ] Focus is visible; Escape closes overlays and returns focus to trigger.
- [ ] Streaming, uploading, generation, conflict detection, and save operations never leave ambiguous state.
- [ ] Reduced motion removes continuous floating/spinning/convergence while preserving feedback.
- [ ] Validate at 375, 768, 1000, 1300, and 1672px.
- [ ] No page-level horizontal scroll.
- [ ] Long titles, answers, code, Chinese text, and 200% text scaling do not overlap controls.
- [ ] Composer, drawers, modals, Xiaoyu, decks, and floating controls remain inside viewport and safe areas.
- [ ] Generated schedule/goal changes require editable confirmation.
- [ ] Tarot displays the reflection-only disclaimer.

## Wave 2 Delivery Order

1. Helper default read state, conversation behavior, composer, code rendering, responsive rails.
2. Schedule dashboard, semantic events, event modal, conflicts, AI import review.
3. Planner overview, create, detail, history, share, Schedule handoff.
4. Helper Xiaoyu expanded state and cross-module status actions.
5. Tarot core draw journey and Planner/Schedule draft handoff.
6. Tarot resonance, workshop, diary, community, and profile extensions.

When implementation screenshots exist, compare every state with `visual-verdict`; score 90 or higher before marking visual completion.
