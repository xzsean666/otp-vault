# AGENTS.md

## Project Rules & AI Operating Guidelines

### 1. Facts & Source of Truth
- Goal: `docs/AI/GOAL.md`
- Task Index: `docs/AI/TASK_INDEX.md`
- Session State: `docs/AI/SESSION_STATE.md`
- Architecture: `docs/AI/ARCHITECTURE.md`
- Decisions: `docs/AI/DECISIONS.md`
- Task details: `docs/AI/tasks/TASK-xxx.md`
- Frontend Design Skill: `docs/Frontend-Design-Skill.md`

### 2. Principles
- One Goal, one Task at a time.
- Default to completing at most one Task per session.
- Scope discipline: No extra features, no unneeded dependencies, no unneeded file changes.
- Safe operations: No destructive git operations (`reset`, `checkout`, recursive rm).
- Verification: Always run tests or build commands; do not report results without actual execution.
- Maintain session continuity: Update `docs/AI/SESSION_STATE.md` at the end of each session.

### 3. Account & Routing Rules
- Any git remote or GitHub CLI (`gh`) operations under `/ssd0/git` MUST route to account `xzsean666`.
