# AI Assistant Core Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the main assistant onto a real server-side boundary, harden action/security handling, and make assistant-driven navigation/action flows actually useful.

**Architecture:** Reuse Supabase Edge Functions as the backend boundary for model access and secret storage. Keep the existing chat UI, but replace the browser-side model transport with a typed client, validate assistant actions/routes before execution, and add query-driven deep links so assistant navigation lands in the correct module state.

**Tech Stack:** Vue 3, TypeScript, Vite, Supabase Edge Functions, Vitest

---

### Task 1: Assistant Protocol Helpers

**Files:**
- Create: `frontend/src/utils/assistantProtocol.ts`
- Test: `frontend/src/utils/assistantProtocol.test.ts`

**Step 1: Write failing tests**
- Verify invalid `spark-action` payloads are ignored.
- Verify valid `navigate`, `add_schedule`, and `create_goal` payloads are normalized.
- Verify assistant href parsing rejects non-`/app` paths and external protocols.

**Step 2: Implement protocol helpers**
- Add typed action parsing/normalization.
- Add route/deep-link sanitization helpers.

**Step 3: Run tests**
- Run: `npm test -- assistantProtocol`

### Task 2: Server-Side Assistant Gateway

**Files:**
- Create: `supabase/functions/assistant-chat/index.ts`

**Step 1: Implement authenticated edge function**
- Authenticate via Supabase token.
- Whitelist allowed models and assistant types.
- Keep prompt ownership on server.
- Call upstream model provider with server-side secret.

**Step 2: Return structured assistant response**
- JSON response with `content`, `reasoning`, and metadata.

### Task 3: Frontend Assistant Transport

**Files:**
- Create: `frontend/src/utils/assistantApi.ts`
- Modify: `frontend/src/composables/useSparkAI.ts`
- Modify: `frontend/src/composables/useCompanion.ts`

**Step 1: Add shared edge-function client**
- Resolve current session token.
- Call `functions/v1/assistant-chat`.

**Step 2: Replace browser-side provider calls**
- Remove hardcoded API-key usage from main chat and companion chat.
- Preserve chat behavior with client-side smooth rendering.

### Task 4: Action Execution and Safe Markdown

**Files:**
- Modify: `frontend/src/pages/app/Chat.vue`

**Step 1: Harden markdown interaction**
- Remove inline `onclick` from rendered markdown/code blocks.
- Handle copy/navigation via delegated click logic.

**Step 2: Complete action execution**
- Wire `create_goal` to real planner persistence.
- Use validated route helpers for navigation actions and markdown deep links.

### Task 5: Deep-Link Support

**Files:**
- Modify: `frontend/src/pages/app/SmartSchedule.vue`
- Modify: `frontend/src/pages/app/Planner.vue`

**Step 1: Support route-query-driven module/tab state**
- Read and sync `module`/`tab` query values.

**Step 2: Support targeting created goals**
- Scroll/focus the requested goal when `goalId` is present.

### Task 6: Verification

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Step 1: Run verification**
- Run targeted tests.
- Run frontend build.

**Step 2: Fix issues and re-run verification**
- Resolve any regressions before delivery.
