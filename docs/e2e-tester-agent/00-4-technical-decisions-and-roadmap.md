# e2e-tester-agent: Technical Decisions and Roadmap

**Version**: 1.0
**Date**: November 13, 2025

## Key Technical Decisions

### 1. Two-Layer Architecture (Decided)

**Decision**: Use AI for decomposition, mechanical executor for browser automation

**Rationale**:
- Clear separation of concerns (SOLID)
- Deterministic execution (testability)
- Independent testing of components
- Better error recovery and debugging
- Type-safe intermediate representation

**Alternative Considered**: Direct code generation
**Why Rejected**: Non-deterministic, hard to test, poor maintainability

---

### 2. TypeScript with Strict Mode (Decided)

**Decision**: Use TypeScript with all strict compiler flags enabled

**Configuration** (tsconfig.json):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Rationale**:
- Catch errors at compile time
- Better IDE support and autocomplete
- Self-documenting code through types
- Easier refactoring
- Prevents entire classes of runtime errors

---

### 3. Task DAG as Core Abstraction (Decided)

**Decision**: Model tests as Directed Acyclic Graphs of atomic tasks

**Mathematical Foundation**:
```
Task T = (V, E) where:
  V = set of subtasks {t₁, t₂, ..., tₙ}
  E = set of dependencies {(tᵢ, tⱼ) | tⱼ depends on tᵢ}

Execution order: Topological sort of DAG
Validation: T complete ⟺ (∀tᵢ ∈ V: validated(tᵢ)) ∧ (∀(tᵢ, tⱼ) ∈ E: completed(tᵢ) < completed(tⱼ))
```

**Rationale**:
- Explicit dependencies prevent race conditions
- Parallelization of independent tasks
- Clear failure propagation
- Well-understood graph algorithms
- Proven in task scheduling systems

---

### 4. Validation as First-Class Predicates (Decided)

**Decision**: Each subtask has explicit validation predicates evaluated after execution

**Types of Validators**:
1. **DOM-based**: Element existence, visibility, text content
2. **URL-based**: Current page URL, query parameters
3. **Count-based**: Number of elements (e.g., cart counter)
4. **Database-based**: Watch table/field for expected values
5. **LLM-based**: Fallback for complex natural language assertions

**Rationale**:
- Explicit success criteria
- Deterministic evaluation (except LLM fallback)
- Composable validation logic
- Easy to add custom validators

---

### 5. Multi-Strategy Element Selection (Decided)

**Decision**: Try multiple selector strategies in order of reliability

**Priority Order**:
1. Test ID (`data-testid`)
2. ARIA role + accessible name
3. Semantic text matching
4. CSS selectors
5. XPath (last resort)

**Rationale**:
- Resilient to UI changes
- Follows accessibility best practices
- Graceful degradation
- Playwright's recommended approach

---

## Open Questions and Future Decisions

### Question 1: Static Code Generation vs. Pure Interpretation

**Current Status**: Leaning toward interpretation with optional generation

**Options**:

**A. Pure Interpretation** (Currently preferred)
- Compile YAML → Task DAG JSON
- Execute JSON dynamically at runtime
- No Playwright test files generated

**Pros**: Flexible, no code to maintain, fast iteration
**Cons**: Harder to debug, no static analysis

**B. Hybrid Approach** (Under consideration)
- Compile YAML → Task DAG JSON → Playwright .spec.ts files
- Execute generated Playwright tests
- Keep JSON for inspection

**Pros**: Standard tooling works, easier debugging, readable output
**Cons**: More complex pipeline, version control noise

**Decision Required By**: Phase 1 MVP completion

---

### Question 2: LLM Strategy for Decomposition

**Current Status**: Single-shot with validation, retry on failure

**Options**:

**A. Single-Shot** (Currently implemented)
- One LLM call per job
- Parse response into subtasks
- Validate DAG (cycles, coverage)
- Retry if invalid (max 3 attempts)

**B. Iterative Refinement**
- Initial decomposition
- Validate
- Ask LLM to fix issues
- Repeat until valid

**C. Multi-Agent**
- Decomposer agent: Break down job
- Validator agent: Check coverage and atomicity
- Fixer agent: Resolve conflicts
- Consensus mechanism

**Trade-offs**:
- **A**: Fast, cheap, simple (but may fail)
- **B**: More reliable, slower, more tokens
- **C**: Most reliable, complex, expensive

**Decision Required By**: After MVP testing shows failure rates

---

### Question 3: State Management Between Tasks

**Current Status**: Each subtask is independent (stateless)

**Problem**: Some workflows need data passing:
- Login returns session token → use in API calls
- Extract order ID from confirmation → verify in database

**Options**:

**A. Shared Context Object**
```typescript
interface ExecutionContext {
  variables: Map<string, unknown>;
  cookies: Cookie[];
  storageState: StorageState;
}
```
Tasks can read/write to context.

**B. Explicit Output/Input Dependencies**
```typescript
interface Subtask {
  outputs?: Array<{ name: string; selector: string }>;
  inputs?: Array<{ name: string; from: number }>;
}
```
Task 2 explicitly depends on output from Task 1.

**C. No State Sharing** (Current)
Rely on browser state (cookies, localStorage) and database.

**Decision Required By**: When implementing complex multi-step flows

---

### Question 4: Async Execution Model

**Current Status**: Sequential execution per DAG topological order

**Problem**: Independent branches could run in parallel

**Options**:

**A. Fully Async**
```typescript
async execute(task: Task): Promise<ExecutionReport> {
  const promises: Map<number, Promise<ExecutionResult>> = new Map();

  for (const subtask of task.subtasks) {
    const depPromises = subtask.dependencies.map(id => promises.get(id)!);

    promises.set(
      subtask.id,
      Promise.all(depPromises).then(() => this.executeSubtask(subtask))
    );
  }

  await Promise.all(promises.values());
}
```

**B. Batch Parallel**
Execute each "level" of DAG in parallel (all tasks with same depth).

**C. Sequential** (Current)
Simple, predictable, easier debugging.

**Trade-offs**:
- **A**: Fastest, complex, harder to debug
- **B**: Good balance, moderate complexity
- **C**: Slowest, simplest, easiest debugging

**Decision Required By**: Performance testing phase

---

### Question 5: Selector Generation Strategy

**Current Status**: LLM suggests selectors during decomposition

**Problem**: AI may suggest fragile or incorrect selectors

**Options**:

**A. AI-Generated Selectors** (Current)
LLM provides selector during decomposition.

**B. Runtime Discovery**
LLM provides intent ("find login button"), runtime tries multiple strategies.

**C. Hybrid**
LLM provides hint, runtime validates and falls back to alternatives.

**Example Hybrid**:
```typescript
interface SelectorHint {
  intent: string; // "login button"
  suggestions: Array<{
    strategy: 'css' | 'text' | 'role';
    value: string;
    confidence: number;
  }>;
}
```
Try in order of confidence, fall back to semantic search.

**Decision Required By**: After testing selector reliability

---

## Implementation Roadmap

### Phase 1: MVP (4-6 weeks)

**Goal**: Basic end-to-end flow working

**Deliverables**:
1. YAML parser with schema validation
2. Single LLM provider (OpenAI)
3. Basic decomposition engine (single-shot)
4. Playwright executor (core actions: navigate, click, type)
5. Simple validation (DOM checks only)
6. CLI (compile + execute commands)
7. HTML report generation

**Success Criteria**:
- Parse demo YAML file
- Decompose into 3-5 subtasks
- Execute in browser successfully
- Validate acceptance criteria
- Generate readable report

**Testing**:
- Unit tests for each component
- Integration test with demo YAML
- Manual testing in dev environment

---

### Phase 2: Production Features (6-8 weeks)

**Goal**: Production-ready with error handling and robustness

**Deliverables**:
1. Multiple LLM providers (OpenAI, Anthropic, local)
2. Advanced validation (URL, database watch, custom)
3. Error recovery and retry logic
4. Multi-strategy selector engine
5. Environment variable support
6. Screenshot on failure
7. JUnit XML reports (CI integration)
8. Comprehensive test suite

**Success Criteria**:
- 90%+ test coverage
- Handles error scenarios gracefully
- Works with complex multi-step flows
- CI/CD integration ready

---

### Phase 3: Advanced Features (8-12 weeks)

**Goal**: Scalability and advanced workflows

**Deliverables**:
1. Recursive task decomposition
2. Parallel execution optimization
3. State management between tasks
4. Custom validation predicates
5. Plugin system for extensibility
6. Performance monitoring and metrics
7. Web UI for test management
8. Distributed execution support

**Success Criteria**:
- Handle 20+ step workflows
- Parallel execution 2-3x faster
- Extensible architecture for custom needs
- Real-time monitoring dashboard

---

### Phase 4: Enterprise Features (Future)

**Deliverables**:
1. Visual test recorder (generates YAML)
2. Test maintenance tools (selector healing)
3. Historical analytics and trends
4. Multi-browser support (Firefox, Safari)
5. Mobile testing (Appium integration?)
6. Integration with test management tools
7. RBAC and team collaboration features
8. SaaS deployment option

---

## Non-Functional Requirements

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| YAML parse time | < 100ms | Unit test |
| LLM decomposition | < 3s per job | Integration test |
| Subtask execution | < 2s per action | Runtime monitoring |
| Total test time (10 subtasks) | < 30s | End-to-end test |
| Report generation | < 1s | Performance test |

### Reliability Targets

| Metric | Target |
|--------|--------|
| Test code coverage | 90%+ |
| Decomposition success rate | 95%+ |
| Selector find rate | 90%+ |
| False positive rate | < 1% |

### Scalability Targets

| Dimension | Phase 1 | Phase 2 | Phase 3 |
|-----------|---------|---------|---------|
| Max subtasks per test | 10 | 30 | 100 |
| Max parallel tests | 1 | 5 | 20 |
| Max YAML file size | 5KB | 50KB | 500KB |

---

## Technology Stack Summary

### Core Dependencies
```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "typescript": "^5.3.0",
    "zod": "^3.22.0",         // Runtime type validation
    "yaml": "^2.3.4",         // YAML parsing
    "commander": "^11.1.0",   // CLI framework
    "winston": "^3.11.0"      // Logging
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "prettier": "^3.1.0"
  }
}
```

### LLM Integration
- OpenAI SDK: `openai ^4.20.0`
- Anthropic SDK: `@anthropic-ai/sdk ^0.9.0`

### Database Support (Optional)
- MySQL: `mysql2 ^3.6.0`
- PostgreSQL: `pg ^8.11.0`

---

## Next Steps

1. Set up project repository with TypeScript configuration
2. Implement Phase 1 MVP following TDD
3. Create comprehensive test suite
4. Document API and usage patterns
5. Conduct user testing with demo scenarios
6. Iterate based on feedback
7. Proceed to Phase 2 based on MVP success

This roadmap provides a clear path forward while keeping key architectural decisions flexible until we have more implementation experience.
