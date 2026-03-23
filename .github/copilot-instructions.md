# Spark Alliance Copilot Instructions

## Build, test, and lint commands

The active runnable app is `frontend` (Vue 3 + TypeScript + Vite).

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

- `npm run build` runs `vue-tsc -b && vite build`, so type-checking is part of build.
- There is currently no lint script and no test runner configured in `frontend/package.json`.
- There is currently no single-test command because no test framework is wired yet.

## High-level architecture

### Runtime boundaries

- `frontend/` contains the only executable product code right now.
- `backend/` currently provides SQL schema (`backend/supabase-schema.sql`) and RLS policies for future backend integration.
- `docs/` is heavily used as project source-of-truth for product scope and workflow decisions.

### Frontend structure and flow

- Entry point: `frontend/src/main.ts` mounts `App.vue` and the Vue Router.
- `App.vue` always renders global visual layers (`ParticleBackground`, `MouseFollower`) and initializes auth via `useAuth().initAuth()` on mount.
- Router (`frontend/src/router/index.ts`) is split into:
  - Public zone: `/`, `/login`, `/register`, `/docs`, `/community`, `/changelog`
  - Protected app zone: `/app/*` under `AppLayout` with `meta.requiresAuth`
- Route guarding checks Supabase session on each navigation and redirects unauthenticated users to `Login`.

### Auth and data access pattern

- Supabase client is centralized in `frontend/src/supabase.ts`.
- `useAuth` (`frontend/src/composables/useAuth.ts`) exposes shared refs (`user`, `session`, `isLoading`) and subscribes to `onAuthStateChange`.
- Auth pages and app shell call Supabase Auth directly (`signInWithPassword`, `signOut`).
- Most feature pages (`AppHome`, `Chat`, `CampusWall`, `Profile`) are currently UI-first with mock/local state; only auth is truly backend-connected now.

## Key conventions in this repository

### UI and styling conventions

- Global cursor is intentionally hidden (`cursor: none` in `src/style.css`) to support custom cursor behavior from `MouseFollower.vue`.
- Reusable design tokens live in `:root` CSS variables in `src/style.css` (`--color-*`, `--gradient-brand`).
- Repeated interaction patterns use utility classes such as `spring-hover`, `glass-pro`, and fade transitions.
- The project uses a dark, glassmorphism-heavy visual system across landing/auth/app pages; preserve this style when adding UI.

### Routing and page conventions

- Keep new authenticated pages under `frontend/src/pages/app` and wire them as children of `/app` in router config.
- Keep public marketing/docs/community pages under `frontend/src/pages/landing`.
- Route names use English identifiers (`AppHome`, `AppChat`, etc.), while visible copy is often Chinese.

### Data and backend conventions

- Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `frontend/.env.*`.
- Local defaults in `supabase.ts` point to `http://localhost:54321` and a fake anon key for dev scaffolding.
- When implementing real backend features, align new data work with `backend/supabase-schema.sql` and `docs/DATA-MODELS.md`.

### Documentation and file-management conventions

- This repo follows an in-place update style for docs: update existing documents rather than creating `-v2`, `-new`, or dated duplicates (from `PROJECT-RULES.md`).
- For project status and phased planning context, consult `docs/AGENTS.md` and `SparkAlliance.md` before major feature work.
