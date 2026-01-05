# Research: Remove RxDB Residual Code

**Branch**: `001-remove-rxdb` | **Date**: 2025-12-31
**Purpose**: Investigate current RxDB usage patterns and determine safe removal strategy

---

## Research Findings

### 1. Current RxDB State

**Decision**: RxDB can be safely removed from the project.

**Rationale**:
- Code scan reveals no `rxdb` or `RxDB` imports in the `src/` directory
- The project constitution explicitly states "RxDB has been deprecated and MUST NOT be used for any new features or data persistence"
- Yjs + y-indexeddb is documented as the sole data storage solution
- RxDB version 15.37.0 is present in package.json but unused

**Evidence**:
```bash
# Grep results for rxdb/RxDB patterns in src/
No files found
```

---

### 2. Package Dependencies Analysis

**Current package.json entries**:
- `"rxdb": "^15.37.0"` in `dependencies`
- `"rxdb"` in `trustedDependencies`

**Decision**: Remove both entries from package.json.

**Rationale**:
- No source code references
- Functionality has been migrated to Yjs stack
- RxDB 15.x is a heavyweight dependency that bloats the bundle

---

### 3. RxJS Dependency Consideration

**Question**: Should RxJS be removed too?

**Decision**: KEEP RxJS dependency.

**Rationale**:
- RxJS is used as the reactive bridge between Svelte 5 and Yjs
- The constitution principle "II. RxJS Reactive Bridge Layer" explicitly mandates RxJS usage
- Proxy classes (TaskProxy, EventProxy) expose RxJS Observables ($ suffix) for Svelte components
- Removing RxJS would break the existing state management architecture

**Evidence from Constitution**:
> RxJS is used as the reactive bridge between Svelte 5 and Yjs. Yjs state changes are exposed through RxJS Observables via proxy classes (TaskProxy, EventProxy, etc.), which Svelte components consume.

---

### 4. Deno Lock File Regeneration

**Decision**: Regenerate deno.lock after package.json modification.

**Rationale**:
- Deno uses deno.lock to pin exact versions of transitive dependencies
- Removing rxdb will change the dependency tree
- Using `deno install` or `deno cache` will regenerate the lock file automatically
- Ensures deterministic builds after dependency changes

---

### 5. Build and Runtime Verification

**Verification Steps Required**:

1. **Type Safety**: Run `svelte-check --tsconfig ./tsconfig.json` to ensure no type errors emerge
2. **Build Test**: Run `vite build` to verify successful compilation
3. **Runtime Test**: Start application (`vite dev`) and verify:
   - Application loads without errors
   - Yjs repositories initialize correctly
   - Existing features work as expected

**Known Affected Areas**: None (no active RxDB usage in code)

---

## Implementation Recommendations

### Minimal Safe Steps

1. Remove `"rxdb": "^15.37.0"` from `package.json` dependencies
2. Remove `"rxdb"` from `package.json` trustedDependencies
3. Run dependency resolution: `deno install` or equivalent
4. Verify old deno.lock entries for rxdb are replaced with clean lock file
5. Run type checking: `npm run check`
6. Run build: `npm run build`
7. (Optional) Clear deno cache: `deno cache --reload` to remove persisted rxdb modules

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hidden RxDB usage in config files | Low | Medium | Grep search of non-source files (md, conf, etc.) |
| Dependency breakage from rxdb consumers | Very Low | High | Code scan already confirmed no usage |
| Deno cache issues after removal | Low | Low | Use `--reload` flag to force cache refresh |
| Build configuration targeting rxdb | Very Low | Medium | Review vite.config.ts (already done - no rxdb references) |

---

## Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Keep RxDB "just in case" | No risk of breakage | Adds bloat, security surface | ❌ Rejected |
| Remove RxDB + RxJS together | Cleaner dependency tree | Breaks reactive bridge pattern | ❌ Rejected |
| Remove RxDB only (current plan) | Minimal change, aligns with constitution | None | ✅ Selected |

---

## Conclusion

The research confirms that RxDB can be safely removed from the project:

1. **No code dependencies**: Source code contains zero references
2. **Constitution alignment**: Removal strengthens Yjs-as-SSOT principle
3. **RxJS preservation**: RxJS must be kept for reactive bridge functionality
4. **Simple verification**: Basic build and smoke tests suffice

Next step: Proceed to Phase 1 design for implementation artifacts.