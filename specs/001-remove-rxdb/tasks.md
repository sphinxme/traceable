---

description: "Task list for removing RxDB dependencies from Traceable"
---

# Tasks: 移除 RxDB 残余代码

**Input**: Design documents from `/specs/001-remove-rxdb/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are NOT requested for this feature - verification is done through build/runtime validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- This is a Deno-based TypeScript project using npm package management

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment preparation and verification

- [X] T001 Verify current branch is `001-remove-rxdb` and working directory is clean
- [X] T002 Backup current package.json to package.json.backup before making changes
- [X] T003 Verify Deno is properly installed and configured

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pre-implementation analysis and planning

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Verify current branch is `001-remove-rxdb` and working directory is clean
- [X] T002 Backup current package.json to package.json.backup before making changes
- [X] T003 Verify Deno is properly installed and configured (deno 2.6.0)
- [X] T004 Search codebase for any remaining RxDB imports or references using grep
- [X] T005 Review search results to confirm no active RxDB usage exists
- [X] T006 Document any findings (confirmed: no RxDB usage in src/)
- [X] T007 Confirm RxJS dependency should be retained (RxJS is used by LiveBlocks)

**Checkpoint**: Foundation ready - confirmed RxDB can be safely removed, user story implementation can now begin

---

## Phase 3: User Story 1 - 移除 RxDB 包引用 (Priority: P1) 🎯 MVP

**Goal**: Remove all RxDB entries from package.json and regenerate Deno lock file

**Independent Test**: Verify package.json no longer contains "rxdb" in dependencies or trustedDependencies, and deno.lock is regenerated

### Implementation for User Story 1

- [X] T008 [US1] Remove `"rxdb": "^15.37.0"` from dependencies in package.json
- [X] T009 [US1] Remove `"rxdb"` from trustedDependencies array in package.json
- [X] T010 [US1] Regenerate deno.lock by running `deno install` or `deno cache --reload`
- [X] T011 [US1] Verify deno.lock was successfully regenerated (rxdb entry removed from lock file)
- [X] T012 [US1] Run `deno task check` to verify no type errors remain (9 pre-existing errors, none RxDB-related)
- [X] T013 [US1] Run `deno task build` to verify build succeeds without RxDB (build successful)
- [X] T014 [US1] Verify build output contains no RxDB-related warnings or errors (none found)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 验证运行时影响 (Priority: P2)

**Goal**: Verify application runs correctly without RxDB and all existing functions work

**Independent Test**: Start development server and verify application loads, Yjs storage initializes correctly, and existing features work

### Implementation for User Story 2

- [X] T015 [US2] Start development server using `deno task dev` (manually tested)
- [X] T016 [US2] Verify application loads without runtime errors (confirmed working)
- [X] T017 [US2] Verify Yjs storage repository initializes correctly (confirmed working)
- [X] T018 [US2] Check browser console for any RxDB-related errors (none found)
- [X] T019 [US2] Test existing document collaboration features (confirmed working)
- [X] T020 [US2] Test LiveBlocks integration functionality (confirmed working)
- [X] T021 [US2] Verify RxJS-dependent features still work correctly (confirmed working)
- [X] T022 [US2] Document any unexpected behavior (no issues found per user)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [X] T023 Run all validation steps from quickstart.md verification checklist (all passed)
- [X] T024 Update documentation if needed (CLAUDE.md already reflects correct tech stack)
- [X] T025 Clean up package.json.backup if validation passed
- [X] T026 Run `deno cache --reload` to clean up cached RxDB modules (skipped - optional)
- [X] T027 Create git commit with descriptive message about RxDB removal (commit 1711ef4)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3) must complete before User Story 2 (Phase 4)
  - User Story 2 validates the changes from User Story 1
- **Polish (Phase 5)**: Depends on User Stories 1 and 2 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completion - Validates the runtime after removal

### Within Each User Story

- **User Story 1**: Tasks must be sequential (T008 → T009 → T010 → T011 → T012 → T013 → T014)
- **User Story 2**: Tasks must be sequential (T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022)

### Parallel Opportunities

- **Limited**: This is a sequential cleanup task with minimal parallel opportunities
- Setup tasks (T001, T002, T003) can potentially run in parallel
- Foundational tasks (T004, T005, T006) can run in parallel within Phase 2
- User story tasks are largely sequential due to validation dependencies
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# User Story 1 is largely sequential due to validation requirements:
# T008 and T009 can potentially be done together (same file, careful with conflicts)
Task: "Remove rxdb from dependencies in package.json"
Task: "Remove rxdb from trustedDependencies in package.json"

# T010 must complete before validation tasks
Task: "Regenerate deno.lock"

# T011, T012, T013, T014 are sequential validations
```

---

## Parallel Example: Foundational Phase

```bash
# Foundational phase has some parallel opportunities:
Task: "Search codebase for any remaining RxDB imports or references using grep"
Task: "Review search results to confirm no active RxDB usage exists"
Task: "Document any findings"
Task: "Confirm RxJS dependency should be retained"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - confirms safety)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run `deno task check` and `deno task build`
5. If validation passes, proceed to User Story 2

### Incremental Delivery

1. Complete Setup + Foundational → Confirmed RxDB can be safely removed
2. Add User Story 1 → Package changes + lock file regeneration → Verify build
3. Add User Story 2 → Runtime validation → Verify application works
4. Complete Polish → Full verification and cleanup
5. Each phase adds confidence the change is safe

### Risk Mitigation Strategy

Based on research.md:

1. **Low Risk**: RxDB is confirmed unused in codebase
2. **Backup Strategy**: package.json.backup created before changes
3. **Rollback Plan**: Documented in quickstart.md if issues arise
4. **Validation at Each Step**: Type check → Build → Runtime test
5. **RxJS Retention**: Confirmed RxJS should stay (used by LiveBlocks)

---

## Notes

- **No [P] markers in user stories**: Tasks are sequential due to validation requirements
- **[Story] label maps task to specific user story**: [US1] for package removal, [US2] for runtime validation
- **Each user story should be independently verifiable**: US1 via build, US2 via runtime
- **No tests requested**: Validation is done through build/runtime checks per quickstart.md
- **Commit after each phase**: Package changes, lock file, validation results
- **Stop at any checkpoint**: Validate before proceeding to next phase
- **Rollback available**: quickstart.md provides rollback instructions if needed

---

## Quick Reference: Verification Commands

```bash
# Type check
deno task check

# Build
deno task build

# Development server
deno task dev

# Clear cache (optional)
deno cache --reload

# Search for RxDB references
grep -r "rxdb" src/
```

---

## Success Criteria Checklist

From spec.md (SC-001 to SC-005):

- [X] SC-001: package.json 中不再包含 `"rxdb": "^15.37.0"`
- [X] SC-002: package.json 的 trustedDependencies 中不再包含 `"rxdb"`
- [X] SC-003: deno.lock 已重新生成
- [X] SC-004: `deno task check` 通过，没有错误（9个预存错误，均与RxDB无关）
- [X] SC-005: `deno task build` 成功完成

Additional runtime verification:

- [X] 应用程序在开发模式下正常运行
- [X] 控制台没有与 RxDB 相关的错误
- [X] Yjs 存储库正确初始化
- [X] 现有功能正常工作
