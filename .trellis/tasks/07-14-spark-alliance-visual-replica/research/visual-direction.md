# Visual Direction And Source Priority

## Canonical Sources

1. Whole-page and state screenshots in `DesingImage/starspark-*`.
2. Module interaction/readme documents beside those screenshots.
3. Component blueprints and design tokens in `tasks/`.
4. Existing working product behavior and data contracts.
5. `.impeccable.md` and `design-system/spark-alliance/MASTER.md`.
6. UI Pro Max search results and generic frontend guidance.

Higher entries override lower entries when guidance conflicts.

## Product Direction

- Product: campus super app combining productivity, AI, social, commerce, health, learning, talent, news, and collaboration.
- Audience: university students using the product repeatedly during study and campus life.
- Tone: premium, youthful, purposeful, cosmic, culturally aware.
- Density: compact operational dashboard, not a marketing landing-page composition.
- Theme: near-black violet surfaces with indigo/purple light, restrained gold, and module-specific functional colors.

## UI Pro Max Supplemental Findings

- The useful color matches were the fintech and Web3 palettes: gold trust/value with purple technology on dark surfaces. Exact project tokens still come from module token files.
- The useful typography match was Simplified Chinese readability. Prefer the existing local stack (`Inter`, `PingFang SC`, `Microsoft YaHei`, sans-serif) and do not add a remote font dependency solely for styling.
- Critical UX checks are keyboard reachability, visible focus, skeleton/loading feedback, a small z-index scale, 150-300ms micro-interactions, reduced-motion support, lazy loading below the fold, and no hidden content behind fixed navigation.
- Useful Vue guidance: semantic elements, dynamic ARIA state, route-level lazy loading, and behavior-focused tests. Suggestions that require adding Pinia are rejected because the project has no Pinia dependency and existing composables already define state ownership.

## Explicit Rejections

- Reject the generated rose social-app palette and newsletter/content-first page pattern.
- Reject generic card grids that change the supplied composition.
- Reject emoji as structural icons where a supplied asset or existing SVG/icon component exists.
- Reject decorative bokeh/orbs and broad glassmorphism not present in the references.
- Reject replacing live data flows with static mockups for visual convenience.

## Dashboard Reference

- Desktop canonical screenshot: `DesingImage/starspark-dashboard/6.png` at 1402x1122.
- Ecosystem extension reference: `DesingImage/starspark-dashboard/5.png` at 1672x941.
- Quick-center reference: `DesingImage/starspark-dashboard/7.png` at 558x996.
- Required structure: fixed left navigation, compact top bar, cosmic hero, six status cards, three-column work area, four-column efficiency area, growth/badges/inspiration/ranking row, exploration grid, footer, and lower-right quick center.
