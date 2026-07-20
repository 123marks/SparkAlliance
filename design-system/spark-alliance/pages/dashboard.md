# Dashboard Override

This page override is authoritative for the authenticated dashboard. It replaces the rose palette, newsletter pattern, white modal, and GSAP route-transition suggestions in `../MASTER.md`.

## Canonical References

- `DesingImage/starspark-dashboard/6.png` at 1402x1122: complete desktop page.
- `DesingImage/starspark-dashboard/7.png` at 558x996: quick-center panel.
- `DesingImage/starspark-dashboard/5.png` at 1672x941: optional ecosystem extension.
- `tasks/dashboard-design-tokens.md` and `tasks/dashboard-blueprints.md`.

## Tokens

```css
--dash-bg-page: #080714;
--dash-bg-sidebar: rgba(10, 8, 24, 0.92);
--dash-bg-topbar: rgba(10, 8, 24, 0.85);
--dash-bg-card: rgba(15, 12, 38, 0.65);
--dash-bg-card-hover: rgba(20, 16, 48, 0.75);
--dash-bg-input: rgba(16, 12, 36, 0.6);
--dash-border-card: rgba(139, 92, 246, 0.12);
--dash-border-card-hover: rgba(139, 92, 246, 0.3);
--dash-accent-purple: #7c3aed;
--dash-accent-purple-light: #a78bfa;
--dash-accent-blue: #3b82f6;
--dash-accent-gold: #f5c55e;
--dash-text-primary: rgba(255, 255, 255, 0.93);
--dash-text-secondary: rgba(255, 255, 255, 0.6);
--dash-text-muted: rgba(255, 255, 255, 0.35);
--dash-sidebar-width: 200px;
--dash-topbar-height: 56px;
--dash-card-gap: 16px;
--dash-section-gap: 24px;
--dash-card-padding: 16px 20px;
--dash-radius-card: 16px;
--dash-transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
--dash-transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--dash-transition-smooth: 300ms cubic-bezier(0.16, 1, 0.3, 1);
```

Use `Inter`, `PingFang SC`, `Microsoft YaHei`, sans-serif. Do not add a remote font dependency.

## Layout

- `>=1400px`: 6 / 3 / 4 / 4 / 6 columns for status / work / efficiency / growth / exploration.
- `1100-1399px`: 3x2 / 2 / 2x2 / 2x2 / 4.
- `768-1099px`: 2x3 / 1 / 2x2 / 2x2 / 3.
- `<768px`: 2x3 / 1 / 1 / 1 / 2 with a vertically stacked hero.

## Interaction

- Hover lift is 2-4px with border/glow changes and no reflow.
- Press scale is 0.98.
- Micro-interactions run 150-300ms; numeric/progress reveals may run 300-700ms.
- Quick-center trigger is 56px at a 24px inset; panel is `min(320px, calc(100vw - 32px))` and max-height 80vh.
- Support visible focus, Escape, focus return, 44px targets, and reduced motion.

## Forbidden

- No rose/light social-app palette.
- No newsletter/marketing composition inside the authenticated dashboard.
- No emoji as final structural icons.
- No screenshot-as-implementation shortcut.
- No static values presented as live operational data.
- No dependency additions for animation or state management.

