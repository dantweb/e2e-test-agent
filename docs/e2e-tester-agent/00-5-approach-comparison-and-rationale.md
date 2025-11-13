# e2e-tester-agent: Approach Comparison and Rationale

**Version**: 1.0
**Date**: November 13, 2025

## Executive Summary

After thorough analysis, we have selected **Approach 2: Two-Layer Interpretation** as the architectural foundation for e2e-tester-agent. This document explains the alternatives considered and provides detailed rationale for this decision.

## The Fundamental Question

How do we transform natural language test specifications (YAML) into executable browser automation code?

```
Input:  prompt: "Login to shop with username=${TEST_USERNAME}"
Output: ??? (Playwright actions that accomplish this)
```

Two primary approaches exist, each with distinct trade-offs.

---

## Approach 1: Direct Code Generation

### Flow Diagram
```
YAML File
    ↓
LLM (Single-shot generation)
    ↓
Complete Playwright Test File (.spec.ts)
    ↓
Playwright Test Runner
    ↓
Execution Results
```

### Description

The LLM generates complete, ready-to-run Playwright test code in a single pass.

**Example Input (YAML)**:
```yaml
- name: login
  prompt: Login to shop with username=${TEST_USERNAME} password=${TEST_PASSWORD}
  acceptance:
    - you are on the home page and see no errors
```

**Example Output (Generated TypeScript)**:
```typescript
import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  // Navigate to login page
  await page.goto('https://oxideshop.dev/login');

  // Find and fill username field
  const usernameInput = page.locator('input[name="username"], input[type="email"]');
  await usernameInput.fill(process.env.TEST_USERNAME);

  // Find and fill password field
  const passwordInput = page.locator('input[name="password"], input[type="password"]');
  await passwordInput.fill(process.env.TEST_PASSWORD);

  // Click submit button
  const submitButton = page.locator('button[type="submit"], button:has-text("Login")');
  await submitButton.click();

  // Wait for navigation
  await page.waitForURL('**/home', { timeout: 5000 });

  // Validate: on home page
  await expect(page).toHaveURL(/.*\/home/);

  // Validate: no errors
  const errorElements = page.locator('.error, .alert-error, [role="alert"]');
  await expect(errorElements).toHaveCount(0);
});
```

### Pros

#### 1. Simple Pipeline
- One transformation step: YAML → Code
- Easy to understand the flow
- Minimal intermediate layers

#### 2. Full Playwright Expressiveness
- Access to entire Playwright API
- No constraints from intermediate representation
- Can use advanced features (iframe handling, multiple tabs, etc.)

#### 3. Standard Tooling
- Generated code is readable by developers
- Use standard Playwright test runner
- IDE support (syntax highlighting, autocomplete)
- Debugger works normally (breakpoints, step-through)

#### 4. Version Control Friendly
- Generated files are diffable (in theory)
- Code review of generated tests possible
- Can manually edit generated code if needed

#### 5. No Runtime Overhead
- No interpretation layer during execution
- Direct Playwright execution
- Potentially faster (no command translation)

### Cons

#### 1. Non-Deterministic Generation
**Problem**: Same YAML may generate different code on each compilation.

**Example**: Run compile twice on same YAML:
```typescript
// First generation
const usernameInput = page.locator('input[name="username"]');

// Second generation (different!)
const usernameField = page.getByRole('textbox', { name: 'username' });
```

**Impact**:
- Hard to track changes in version control
- Diffs show large changes even for small YAML updates
- Testing the generator is difficult (output varies)

#### 2. Poor Consistency
**Problem**: Different jobs may use different patterns for same actions.

**Example**:
```typescript
// Job 1: uses CSS selectors
await page.locator('button.submit').click();

// Job 2: uses text matching (for same type of button)
await page.getByText('Submit').click();

// Job 3: uses role-based
await page.getByRole('button', { name: 'Submit' }).click();
```

**Impact**:
- Maintenance nightmare
- Hard to apply global changes
- Inconsistent error messages

#### 3. Difficult Error Recovery
**Problem**: If generation fails or produces bad code, only option is to regenerate entirely.

**Scenarios**:
- LLM generates invalid selector → entire test file is broken
- Retry means regenerating entire test (expensive, slow)
- No way to patch or fix specific subtasks

#### 4. Testing the Generator is Complex
**Problem**: How do you test that the generator works correctly?

**Challenges**:
- Output varies → hard to assert expected code
- Need to run generated code to verify correctness
- Circular dependency: testing test generator
- Mocking LLM responses is brittle

#### 5. Maintenance of Generated Code
**Problem**: Who maintains the generated files?

**Questions**:
- Should generated files be checked into version control?
- Can developers edit generated code manually?
- If YAML changes, do we regenerate and lose manual edits?
- How to handle conflicts between generated and manual changes?

#### 6. LLM Hallucinations Impact Entire Test
**Problem**: If LLM makes one mistake, the entire test file may be unusable.

**Example**:
```typescript
// LLM hallucinates a non-existent API
await page.locator('button').magicClick(); // ← Does not exist!
```

**Impact**:
- Test won't compile
- Must regenerate entire file
- Wasted LLM API calls

#### 7. Hard to Debug AI Issues
**Problem**: When generated code fails, is it the AI's fault or the test?

**Example**:
```typescript
// Test fails: Element not found
await page.locator('#wrong-id').click();
```

**Questions**:
- Did LLM generate wrong selector?
- Did page structure change?
- Is YAML prompt ambiguous?
- How to provide feedback to improve generation?

### Summary of Approach 1

| Aspect | Rating | Notes |
|--------|--------|-------|
| Simplicity | ⭐⭐⭐⭐⭐ | Very simple pipeline |
| Determinism | ⭐ | Output varies between runs |
| Maintainability | ⭐⭐ | Difficult to maintain generated code |
| Debuggability | ⭐⭐⭐ | Standard tools work, but unclear what to fix |
| Testability | ⭐⭐ | Hard to test generator itself |
| Error Recovery | ⭐ | Must regenerate entire file |
| Consistency | ⭐⭐ | Different patterns for same actions |

---

## Approach 2: Two-Layer Interpretation (Recommended)

### Flow Diagram
```
YAML File
    ↓
LLM (Decomposition)
    ↓
Intermediate Representation (Task DAG JSON)
    ↓
Validation & Storage
    ↓
Mechanical Executor (Playwright Wrapper)
    ↓
Deterministic Browser Actions
    ↓
Execution Results
```

### Description

The process is split into two distinct phases:

1. **AI Interpretation Layer**: LLM converts natural language into structured, atomic commands
2. **Mechanical Execution Layer**: Deterministic engine executes commands using Playwright wrapper

**Example Input (YAML)**:
```yaml
- name: login
  prompt: Login to shop with username=${TEST_USERNAME} password=${TEST_PASSWORD}
  acceptance:
    - you are on the home page and see no errors
```

**Example Intermediate Representation (JSON)**:
```json
{
  "id": "login-task",
  "subtasks": [
    {
      "id": 1,
      "action": "navigate",
      "url": "https://oxideshop.dev/login",
      "dependencies": [],
      "acceptance": [
        {
          "type": "url_matches",
          "pattern": ".*/login"
        }
      ]
    },
    {
      "id": 2,
      "action": "type",
      "selector": {
        "role": "textbox",
        "name": "username",
        "fallback": "input[name='username']"
      },
      "value": "${TEST_USERNAME}",
      "dependencies": [1],
      "acceptance": [
        {
          "type": "dom_exists",
          "selector": "input[name='username']:filled"
        }
      ]
    },
    {
      "id": 3,
      "action": "type",
      "selector": {
        "role": "textbox",
        "name": "password",
        "fallback": "input[type='password']"
      },
      "value": "${TEST_PASSWORD}",
      "dependencies": [1],
      "acceptance": []
    },
    {
      "id": 4,
      "action": "click",
      "selector": {
        "role": "button",
        "name": "Login",
        "fallback": "button[type='submit']"
      },
      "dependencies": [2, 3],
      "acceptance": [
        {
          "type": "navigation_occurred"
        }
      ]
    },
    {
      "id": 5,
      "action": "assert",
      "dependencies": [4],
      "acceptance": [
        {
          "type": "url_matches",
          "pattern": ".*/home"
        },
        {
          "type": "element_count",
          "selector": ".error, [role='alert']",
          "expected": 0
        }
      ]
    }
  ]
}
```

**Execution (Mechanical)**:
```typescript
// Playwright executor runs commands deterministically
for (const subtask of taskDAG.subtasks) {
  switch (subtask.action) {
    case 'navigate':
      await executor.navigate(subtask.url);
      break;
    case 'type':
      await executor.type(subtask.selector, subtask.value);
      break;
    case 'click':
      await executor.click(subtask.selector);
      break;
    case 'assert':
      await executor.assert(subtask.acceptance);
      break;
  }

  // Validate acceptance criteria
  await validator.validate(subtask);
}
```

### Pros

#### 1. Separation of Concerns
**Benefit**: AI does interpretation, Playwright does execution.

**Example**:
- AI Layer: "Login to shop" → `[navigate, type username, type password, click button]`
- Mechanical Layer: Execute commands using Playwright wrapper

**Why this matters**:
- Each layer has one responsibility (SOLID Single Responsibility Principle)
- Can replace AI provider without changing executor
- Can improve execution logic without re-prompting LLM

#### 2. Deterministic Execution
**Benefit**: Same intermediate representation always produces same browser actions.

**Example**:
```json
{"action": "click", "selector": {"css": "button.submit"}}
```
This **always** executes as:
```typescript
await page.locator('button.submit').click();
```

**Why this matters**:
- Reproducible tests
- Easier debugging (know exactly what will happen)
- No surprises during execution

#### 3. Easier Debugging
**Benefit**: Can inspect intermediate representation to understand what AI intended.

**Debugging workflow**:
1. Test fails
2. Inspect JSON: See exact commands AI generated
3. Identify issue: "AI used wrong selector for username field"
4. Fix: Either update YAML prompt or patch JSON
5. Re-execute (no need to regenerate)

**Why this matters**:
- Clear boundary between AI and execution issues
- Can fix execution without re-querying LLM
- Logs show both intent (JSON) and actions (Playwright logs)

#### 4. Better Error Handling
**Benefit**: Can retry individual commands, not entire tests.

**Example scenario**:
```
Subtask 3 fails: "Button not found"
```

**Recovery options**:
1. Retry subtask 3 with alternative selector
2. Skip subtask 3, continue with subtask 4
3. Execute fallback action defined in on_error

**Approach 1** would require:
- Regenerate entire test file
- Re-execute all previous subtasks
- Hope LLM generates different code this time

#### 5. Reusable Command Library
**Benefit**: Build and test a stable, well-tested execution library.

**Example library**:
```typescript
class PlaywrightExecutor {
  // Tested once, works reliably
  async click(selector: Selector): Promise<void> {
    // Smart retry logic
    // Multiple selector strategies
    // Automatic waiting
    // Screenshot on failure
  }

  async type(selector: Selector, text: string): Promise<void> {
    // Clear field first
    // Handle special characters
    // Verify text entered
  }
}
```

**Why this matters**:
- Execution logic tested thoroughly once
- Apply improvements to all tests automatically
- No duplication (DRY principle)

#### 6. Type Safety
**Benefit**: Intermediate representation is strongly typed.

**Example**:
```typescript
interface Subtask {
  readonly id: number;
  readonly action: ActionType; // Enum, not string
  readonly selector?: ElementSelector; // Validated structure
  readonly dependencies: ReadonlyArray<number>; // Must be valid IDs
}
```

**Compile-time checks**:
```typescript
// This won't compile:
const subtask: Subtask = {
  id: 1,
  action: "invalid-action", // ← Error: not in ActionType enum
  dependencies: ["wrong"]    // ← Error: must be number[]
};
```

**Why this matters**:
- Catch errors at compile time, not runtime
- IDE autocomplete works
- Refactoring is safe

#### 7. Testability
**Benefit**: Can unit test AI layer and execution layer independently.

**AI Layer tests**:
```typescript
test('decompose login prompt', async () => {
  const job = { prompt: 'Login with user/pass' };
  const taskDAG = await decomposer.decompose(job);

  expect(taskDAG.subtasks).toHaveLength(4);
  expect(taskDAG.subtasks[0].action).toBe('navigate');
  expect(taskDAG.subtasks[1].action).toBe('type');
});
```

**Execution Layer tests** (no AI involved):
```typescript
test('click executes correctly', async () => {
  const subtask = {
    action: 'click',
    selector: { css: 'button.test' }
  };

  await executor.execute(subtask);

  expect(mockPage.locator).toHaveBeenCalledWith('button.test');
  expect(mockLocator.click).toHaveBeenCalled();
});
```

**Why this matters**:
- Fast unit tests (no LLM calls, no browser)
- Mock LLM responses for decomposer tests
- Mock Playwright for executor tests
- High test coverage achievable

#### 8. Versioning and Caching
**Benefit**: Can cache intermediate representations.

**Scenario**:
```
User runs same YAML test 10 times
```

**Approach 2**:
- Decompose once (1 LLM call)
- Cache JSON
- Execute 10 times using cached JSON
- Cost: 1 LLM call

**Approach 1**:
- Generate code 10 times (10 LLM calls)
- Cost: 10 LLM calls

**Why this matters**:
- Faster execution (no LLM latency)
- Cheaper (fewer API calls)
- More reliable (don't depend on LLM availability for execution)

### Cons

#### 1. More Complex Architecture
**Challenge**: Additional layers mean more components to build and maintain.

**Comparison**:

**Approach 1** (2 components):
1. LLM code generator
2. Playwright test runner

**Approach 2** (5 components):
1. YAML parser
2. LLM decomposer
3. Intermediate representation (DAG builder)
4. Validation engine
5. Playwright executor

**Mitigation**:
- Use Clean Architecture to manage complexity
- Each component has single responsibility
- Comprehensive tests for each component
- Clear interfaces between layers

**Why acceptable**:
- Complexity is in the framework, not in user's tests
- Better complexity management than Approach 1's "everything in generator"

#### 2. Requires Intermediate Representation
**Challenge**: Must design and maintain JSON schema for task commands.

**Example design decisions**:
```typescript
// How to represent selectors?
interface ElementSelector {
  css?: string;
  xpath?: string;
  text?: string;
  role?: string;
  testId?: string;
}

// How to represent validation?
interface ValidationPredicate {
  type: ValidationType;
  params: Record<string, unknown>;
}

// How to represent dependencies?
dependencies: number[]; // By ID? By name?
```

**Mitigation**:
- Use JSON Schema for validation
- Version the schema (e.g., v1.0.0)
- Document schema thoroughly
- Provide migration tools for schema changes

**Why acceptable**:
- Intermediate representation makes intent explicit
- Serves as documentation of test logic
- Easier to understand than generated code

#### 3. Limited to Command Set
**Challenge**: Executor only supports predefined commands.

**Example limitation**:
```typescript
// Supported
await executor.click(selector);
await executor.type(selector, text);

// Not supported (unless we add it)
await executor.dragAndDrop(fromSelector, toSelector);
```

**Mitigation**:
- Start with common commands (cover 90% of cases)
- Design extensible command system
- Allow custom command plugins
- Document how to add new commands

**Example extension**:
```typescript
interface CustomCommand {
  name: string;
  execute(params: Record<string, unknown>): Promise<void>;
}

executor.registerCommand('dragAndDrop', {
  async execute(params) {
    await page.locator(params.from).dragTo(page.locator(params.to));
  }
});
```

**Why acceptable**:
- Can add commands over time
- Most E2E tests use basic actions
- Extension mechanism provides escape hatch

#### 4. Two-Phase Latency
**Challenge**: Decomposition then execution adds latency.

**Timing comparison**:

**Approach 1**:
```
Generate code: 3s (LLM call)
Execute: 10s (Playwright)
Total: 13s
```

**Approach 2**:
```
Decompose: 3s (LLM call)
Validate & store: 0.1s
Execute: 10s (Playwright)
Total: 13.1s
```

**Mitigation**:
- Cache intermediate representation (run 1 decompose, N executions)
- Validate schema in parallel with LLM call
- Optimize JSON parsing

**Why acceptable**:
- Difference is negligible (0.1s)
- Caching eliminates decomposition on subsequent runs
- Execution time dominates (10s vs 0.1s)

### Summary of Approach 2

| Aspect | Rating | Notes |
|--------|--------|-------|
| Simplicity | ⭐⭐⭐ | More components, but well-organized |
| Determinism | ⭐⭐⭐⭐⭐ | Completely deterministic execution |
| Maintainability | ⭐⭐⭐⭐⭐ | Clean separation, reusable library |
| Debuggability | ⭐⭐⭐⭐⭐ | Inspect intermediate representation |
| Testability | ⭐⭐⭐⭐⭐ | Unit test each layer independently |
| Error Recovery | ⭐⭐⭐⭐⭐ | Retry individual commands |
| Consistency | ⭐⭐⭐⭐⭐ | Same actions always use same execution |

---

## Side-by-Side Comparison

| Criterion | Approach 1: Code Generation | Approach 2: Two-Layer | Winner |
|-----------|----------------------------|----------------------|--------|
| **Pipeline Complexity** | Simple (1 step) | Complex (2 steps) | Approach 1 |
| **Determinism** | Non-deterministic | Deterministic | **Approach 2** |
| **Debugging** | Hard (opaque generation) | Easy (inspect JSON) | **Approach 2** |
| **Error Recovery** | Poor (regenerate all) | Good (retry subtask) | **Approach 2** |
| **Testability** | Hard (output varies) | Easy (mock layers) | **Approach 2** |
| **Consistency** | Low (random patterns) | High (same executor) | **Approach 2** |
| **Type Safety** | Low (generated code) | High (typed JSON) | **Approach 2** |
| **Maintainability** | Low (who owns generated code?) | High (clear ownership) | **Approach 2** |
| **Execution Speed** | Fast (direct) | Fast (negligible overhead) | Tie |
| **Playwright Features** | Full access | Limited to command set | Approach 1 |
| **LLM Cost** | Higher (generate every time) | Lower (cache JSON) | **Approach 2** |
| **Version Control** | Poor (large diffs) | Good (structured JSON) | **Approach 2** |

**Score**: Approach 1: 2 wins, Approach 2: 10 wins

---

## Decision Rationale

We chose **Approach 2: Two-Layer Interpretation** for the following reasons:

### 1. Alignment with SOLID Principles

**Single Responsibility**:
- AI Layer: Interpret intent
- Execution Layer: Perform actions

**Dependency Inversion**:
- Layers depend on abstractions (interfaces)
- Can swap LLM providers or execution engines

### 2. Testability (TDD Requirement)

With TDD, we need to:
- Write tests first
- Test components in isolation
- Achieve high coverage

**Approach 2** enables:
- Unit tests for decomposer (mock LLM)
- Unit tests for executor (mock Playwright)
- Integration tests with real components
- Fast test execution (no LLM calls in most tests)

**Approach 1** struggles with:
- Testing code generator requires running generated code
- Output varies, hard to assert
- Mocking is complex and brittle

### 3. Clean Code Principles

**DRY (Don't Repeat Yourself)**:
- Approach 2: Execution logic in reusable library
- Approach 1: Same logic generated repeatedly in each test

**Small Functions**:
- Approach 2: Each executor method < 20 lines
- Approach 1: Generated functions can be arbitrarily large

**Clarity**:
- Approach 2: JSON explicitly states intent
- Approach 1: Intent hidden in generated code

### 4. Maintainability

**Question**: What happens when Playwright API changes?

**Approach 1**:
- Update LLM prompt
- Regenerate all tests
- Hope LLM adapts correctly
- Manual review of all generated code

**Approach 2**:
- Update executor methods
- Test executor changes
- Re-run existing tests (no regeneration)
- JSON remains unchanged

### 5. Real-World Scalability

**Scenario**: 100 test files, need to improve error handling

**Approach 1**:
- Update prompt
- Regenerate 100 test files
- Review 100 diffs
- Cost: 100 LLM calls

**Approach 2**:
- Update executor error handling
- Test changes
- Re-run 100 tests
- Cost: 0 LLM calls

### 6. Debugging Experience

**Scenario**: Test fails with "Element not found"

**Approach 1 debugging**:
```typescript
// Generated code:
await page.locator('#some-id').click();
```
- Question: Why did LLM choose '#some-id'?
- Answer: Unclear, generated code doesn't explain
- Fix: Modify prompt? Manually edit code? Regenerate?

**Approach 2 debugging**:
```json
{
  "action": "click",
  "selector": {
    "css": "#some-id",
    "rationale": "Login button in header nav"
  }
}
```
- Question: Why '#some-id'?
- Answer: JSON shows rationale
- Fix: Edit JSON selector, re-execute (no LLM call)

### 7. Incremental Improvement

**Approach 2** allows gradual enhancement:

**Phase 1**: Basic commands (navigate, click, type)
**Phase 2**: Add validation predicates
**Phase 3**: Add error recovery
**Phase 4**: Add parallel execution
**Phase 5**: Add custom commands

Each phase:
- Doesn't break existing tests
- Enhances executor library
- Benefits all tests automatically

**Approach 1** requires:
- Regenerate all tests for improvements
- LLM may not use new features consistently
- Hard to ensure all tests benefit

---

## Conclusion

While **Approach 1: Direct Code Generation** has the advantage of simplicity and full Playwright API access, **Approach 2: Two-Layer Interpretation** aligns better with our development principles:

✅ **TDD**: Each layer independently testable
✅ **SOLID**: Clear separation of responsibilities
✅ **Clean Code**: DRY, small functions, clear intent
✅ **Type Safety**: Strict TypeScript throughout
✅ **Maintainability**: Changes isolated to appropriate layers

The additional architectural complexity is a worthwhile trade-off for:
- Deterministic execution
- Better debugging
- Easier testing
- Clearer error recovery
- Scalable maintenance

Therefore, we proceed with **Approach 2: Two-Layer Interpretation** as the foundation for e2e-tester-agent.

---

## References

- [00-1: Introduction and Core Challenge](./00-1-introduction-and-challenge.md)
- [00-2: Layered Architecture](./00-2-layered-architecture.md)
- [00-3: Infrastructure and Execution](./00-3-infrastructure-and-execution.md)
- [00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md)
