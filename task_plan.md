# Task Plan: AI Assistant Core Audit and Hardening

## Goal
Deeply understand the project, audit the AI assistant core for architecture, security, answer quality, and actionability, then implement and verify prioritized backend improvements without unnecessary UI changes.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify initial constraints and requirements
- [ ] Map repository structure and AI assistant execution path
- [ ] Document findings in findings.md
- **Status:** in_progress

### Phase 2: Architecture & Risk Review
- [ ] Identify assistant entrypoints, orchestration flow, tool/runtime dependencies, and content routing
- [ ] Review security boundaries, prompt handling, data access, and unsafe execution paths
- [ ] Review response quality controls, prioritization logic, and real-time navigation/linking capabilities
- [ ] Produce a prioritized implementation backlog aligned with OpenSpec-style rigor
- **Status:** pending

### Phase 3: Implementation
- [ ] Add focused tests for the highest-priority gaps before changing behavior where feasible
- [ ] Implement backend/core improvements in small verified increments
- [ ] Preserve existing UI unless changes are strictly necessary for feature completion
- [ ] Avoid clobbering unrelated local changes
- **Status:** pending

### Phase 4: Verification & Bug Fixing
- [ ] Run targeted test, lint, and build verification for touched areas
- [ ] Manually verify the assistant flow and real-time jump/navigation behavior if available locally
- [ ] Fix regressions and repeat verification
- [ ] Document final residual risks
- **Status:** pending

### Phase 5: Delivery
- [ ] Summarize audit findings by severity
- [ ] Summarize implemented improvements and validation evidence
- [ ] Hand off clear next steps if any non-blocking follow-up remains
- **Status:** pending

## Key Questions
1. What is the true AI assistant core path from user input to model/tool/output in this repository?
2. Where are the biggest correctness, safety, and answer-quality gaps?
3. What blocks the assistant from becoming action-oriented instead of a passive chat surface?
4. How is "jump to relevant content" expected to work today, and what part of the chain is missing?
5. Which changes can be made safely without trampling existing uncommitted work?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use persistent planning files in project root | This task is long-running and will exceed volatile context comfortably. |
| Start with repository and assistant-flow discovery before any fixes | The user requested a deep audit, and changing behavior before understanding root cause would be guesswork. |
| Treat existing local modifications as user-owned unless proven otherwise | Prevents destructive interference with in-progress work. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `session-catchup.py` timed out on first run | 1 | Re-run later with a longer timeout after initial repo triage. |
| Broad `rg --files` scan timed out | 1 | Replace with narrower directory/package discovery commands. |

## Notes
- Re-read this plan before major decisions.
- Log discoveries after every exploration burst.
- Favor small verified changes over broad refactors.
