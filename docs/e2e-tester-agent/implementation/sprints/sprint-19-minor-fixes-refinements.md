# Sprint 19: Minor Fixes and Architecture Refinements

**Priority**: LOW-MEDIUM
**Duration**: 2 days
**Dependencies**: None
**Status**: PLANNED
**Addresses**: Low/Medium Priority Architectural Deviations

---

## 🎯 Sprint Goals

Address remaining minor architectural gaps and clean up classifications.

---

## 📋 Tasks

### 1. Add Task Metadata Field (0.5 days)

**Issue**: Task entity missing `metadata` field documented in architecture

**Implementation**:
```typescript
// src/domain/entities/Task.ts

export interface TaskMetadata {
  readonly author?: string;
  readonly created?: Date;
  readonly tags?: ReadonlyArray<string>;
  readonly parallelism?: number;
  readonly timeout?: number;
  readonly retries?: number;
  readonly priority?: number;
  readonly custom?: Record<string, unknown>;
}

export class Task {
  // Add field
  readonly metadata: TaskMetadata;

  constructor(params: TaskConstructorParams) {
    // ...
    this.metadata = params.metadata || {};
  }
}
```

**Files to Modify**:
- `src/domain/entities/Task.ts`

**Tests**: 10+ tests for metadata handling

---

### 2. Clarify ExecutionContextManager Location (0.5 days)

**Issue**: Unclear if ExecutionContextManager belongs in Application or Infrastructure layer

**Decision Needed**:
- **Option A**: Keep in Application (orchestration of context)
- **Option B**: Move to Infrastructure (technical concern)
- **Recommendation**: Keep in Application but document clearly

**Actions**:
- Add JSDoc explaining layer classification
- Update architecture diagram
- Document design decision

**Files to Modify**:
- `src/application/orchestrators/ExecutionContextManager.ts` (add documentation)
- `docs/e2e-tester-agent/00-2-layered-architecture.md` (clarify)

---

### 3. Abstract HTMLExtractor from Playwright Page (1 day)

**Issue**: HTMLExtractor tightly coupled to Playwright Page object

**Implementation**:
```typescript
// Create abstraction layer

export interface IPageAdapter {
  content(): Promise<string>;
  evaluate<T>(fn: () => T): Promise<T>;
  locator(selector: string): ILocatorAdapter;
}

export class PlaywrightPageAdapter implements IPageAdapter {
  constructor(private page: Page) {}

  async content(): Promise<string> {
    return this.page.content();
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    return this.page.evaluate(fn);
  }

  locator(selector: string): ILocatorAdapter {
    return new PlaywrightLocatorAdapter(this.page.locator(selector));
  }
}

// HTMLExtractor now takes IPageAdapter
export class HTMLExtractor {
  constructor(private pageAdapter: IPageAdapter) {}
}
```

**Benefits**:
- Easier to test (mock adapter)
- Less coupling to Playwright
- Could support other browser automation tools

**Files to Create**:
- `src/infrastructure/adapters/IPageAdapter.ts`
- `src/infrastructure/adapters/PlaywrightPageAdapter.ts`

**Files to Modify**:
- `src/application/engines/HTMLExtractor.ts`

**Tests**: 15+ tests with mocked adapter

---

### 4. Implement Recursive Decomposition Option (Optional, if time permits)

**Issue**: Documented approach is recursive with maxDepth, current is iterative

**Note**: Both approaches are valid. This is an enhancement, not a bug fix.

**Implementation**:
Add recursive mode alongside iterative:
```typescript
interface DecompositionOptions {
  mode: 'iterative' | 'recursive';
  maxDepth?: number; // For recursive mode
  maxIterations?: number; // For iterative mode
}
```

**Files to Modify**:
- `src/application/engines/TaskDecomposer.ts`

**Tests**: 20+ tests for recursive mode

---

## 🧪 Testing Strategy

- **Unit Tests**: 50+ tests covering all changes
- **Integration Tests**: 10+ tests for adapter pattern
- **Regression Tests**: Ensure no breaking changes

---

## 📊 Success Metrics

- ✅ Task metadata field added
- ✅ ExecutionContextManager clarified
- ✅ HTMLExtractor decoupled
- ✅ All tests passing
- ✅ Architecture alignment: 98% → 100%

---

## 🚀 Deliverables

1. Task with metadata field
2. Clarified layer classifications
3. Page adapter abstraction
4. Updated documentation
5. 60+ tests

---

**Files to Create** (2-3 files):
- `src/infrastructure/adapters/IPageAdapter.ts`
- `src/infrastructure/adapters/PlaywrightPageAdapter.ts`
- `src/domain/interfaces/TaskMetadata.ts` (optional, could be inline)

**Files to Modify** (4-5 files):
- `src/domain/entities/Task.ts`
- `src/application/orchestrators/ExecutionContextManager.ts`
- `src/application/engines/HTMLExtractor.ts`
- `docs/e2e-tester-agent/00-2-layered-architecture.md`
- `src/application/engines/TaskDecomposer.ts` (optional)

---

## ⚠️ Risks

### Risk 1: HTMLExtractor Refactoring
**Impact**: MEDIUM (could break tests)
**Mitigation**:
- Maintain backward compatibility
- Update all usages simultaneously
- Comprehensive testing

### Risk 2: Metadata Field Usage
**Impact**: LOW
**Mitigation**:
- Make optional
- Provide good defaults
- Document use cases

---

## 📝 Definition of Done

- [ ] All tasks completed
- [ ] 60+ tests passing
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Code reviewed
- [ ] Architecture alignment 100%

---

**Sprint Owner**: TBD
**Start Date**: TBD
**Target End Date**: TBD
