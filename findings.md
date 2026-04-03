# Findings & Decisions

## Requirements
- Deeply understand the project before making changes.
- Audit the AI assistant core rather than redesigning UI.
- Focus on code optimization, safety, answer quality, and OpenSpec-style rigor.
- Produce a clear execution task list, then advance through it autonomously.
- Keep working through reasoning, coding, review, testing, fixing, and delivery unless a destructive action would be required.
- Make the assistant actually useful and action-oriented, including real-time jumping to relevant content if the codebase supports that direction.

## Research Findings
- The repo already contains uncommitted local changes in `frontend/src/composables/useCompanion.ts` and `frontend/src/pages/app/Chat.vue`.
- Planning-with-files templates exist and are now instantiated in project root for persistent state.
- Repository top level is front-end centric: `frontend/` appears to hold the main product, while `backend/news-crawler/` is a separate crawler utility rather than the assistant backend.
- The app router exposes both `/app/chat` and `/app/companion`, which indicates two assistant-like experiences: a main AI chat and a companion/social chat.
- The main AI implementation is strongly indicated by `frontend/src/composables/useSparkAI.ts` plus `frontend/src/pages/app/Chat.vue`.
- `frontend/src/composables/useCompanion.ts` contains a second AI path with its own prompt and `chat/completions` calls, likely duplicating logic and increasing drift/risk.
- The current codebase has multiple AI-adjacent modules beyond the main chat, including planner and health helper flows that call model endpoints directly, suggesting fragmented orchestration and inconsistent quality controls.
- `frontend/package.json` shows a pure Vite/Vue frontend with no dedicated server package for the assistant orchestration path in the main app.
- `useSparkAI.ts` hardcodes an NVIDIA API key in client code and sends browser requests directly to `/api/nvidia/chat/completions`, which is a critical credential-exposure issue if shipped as-is.
- `useCompanion.ts` repeats the same pattern with a second hardcoded API key and a different prompt/model policy, which doubles the attack surface and configuration drift.
- The main chat action loop is markdown-based rather than true function calling: the model is instructed to emit fenced `spark-action` JSON blocks, then the frontend parses them with regex and executes local actions.
- The current main action executor appears limited to `add_schedule`, `create_goal`, and `navigate`, with only `add_schedule` and `navigate` actually implemented in the page layer.
- Real-time jump-to-content already partially exists: markdown links to `/app/...` are rewritten into clickable buttons and `router.push()` is called on click, but the path only covers static route jumps and not deeper contextual navigation.
- The router file appears to contain mojibake/comments with encoding corruption, which is a maintainability smell and may indicate mixed file encodings in the repo.
- `frontend/vite.config.ts` proxies `/api/nvidia` only in the Vite dev server, so the current main chat transport is likely development-only unless production hosting adds an equivalent rewrite outside the repo.
- The repository already contains Supabase Edge Functions (`supabase/functions/ai-schedule-import`, `supabase/functions/tarot-reading`) with authenticated server-side API calls and secret management patterns, so the assistant can reuse an existing backend boundary rather than inventing a new stack.
- `frontend/src/components/schedule/AIImportModal.vue` already calls a Supabase Edge Function over `functions/v1/...`, which is a concrete precedent for migrating main assistant calls off the client.
- `frontend/src/composables/usePlanner.ts` exposes a real `createGoal(...)` persistence path, which means the chat action loop could execute goal creation properly today but currently does not wire into it.
- `frontend/src/composables/useSchedule.ts` exposes `createEvent(...)` as a real persistence path and is already used by chat action execution.
- `frontend/.env.local` contains concrete Supabase project values, confirming the repo expects runtime secrets/config to come from environment variables rather than hardcoded source for deployment-sensitive paths.
- `frontend/src/pages/app/Chat.vue` allows inline `onclick` through DOMPurify and injects inline clipboard handlers into rendered markdown code blocks; combined with model-controlled markdown, this is an avoidable XSS surface.
- The main chat advertises file/image understanding, but image attachments are only labeled in prompt text rather than being sent as real multimodal payloads; this creates a capability mismatch that harms answer quality and user trust.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Audit first, then implement a prioritized backlog | This preserves rigor and avoids speculative fixes. |
| Keep scope centered on assistant core behavior, orchestration, safety, and content/action flow | User explicitly said UI changes are not the goal. |
| Treat hardcoded client API credentials as top-priority blockers | This is a direct security exposure, not an optional optimization. |
| Treat duplicated assistant logic as a major architecture issue | Split prompts/models/action logic will degrade answer quality and make fixes inconsistent. |
| Use Supabase Edge Functions as the preferred server-side boundary for assistant requests | The pattern already exists locally and matches the deployment model in this repo. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Initial catch-up and wide file enumeration timed out | Switching to narrower, targeted discovery commands. |
| Several source files render with mojibake in terminal output | Continue with targeted inspection and treat encoding consistency as a review item. |

## Resources
- `task_plan.md`
- `progress.md`
- `frontend/src/composables/useCompanion.ts`
- `frontend/src/pages/app/Chat.vue`
- `frontend/src/composables/useSparkAI.ts`
- `frontend/src/router/index.ts`
- `frontend/package.json`

## Visual/Browser Findings
- None yet.
