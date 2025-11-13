# e2e-tester-agent: Decided Questions and Implementation Specifications

**Version**: 1.0
**Date**: November 13, 2025
**Status**: Decisions finalized, ready for implementation

## Overview

This document records the final decisions for open questions identified in [00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md). These decisions provide clear direction for Phase 1 (MVP) implementation.

---

## Decision 1: Static Code Generation vs. Pure Interpretation

**Question**: Should we generate static Playwright test files or interpret oxtest dynamically?

### ✅ Decision: A. Pure Interpretation

**Rationale**: Oxtest files are interpreted at runtime, no static Playwright files generated.

### Implementation Specification

**Compilation Phase**:
```bash
npm run e2e-test-compile --src=test.yaml --output=_generated
```

**Output**:
```
_generated/
├── manifest.json
├── login-test.ox.test        # Oxtest files (not .ts/.js)
├── shopping-test.ox.test
└── checkout-test.ox.test
```

**Execution Phase**:
```bash
npm run e2e-test-run _generated
```

**Process**:
1. Load `manifest.json`
2. For each `.ox.test` file:
   - Parse oxtest → Command objects
   - Execute commands via Playwright executor
   - Validate results
3. Generate reports

### No Static Code Generation

**What we DON'T do**:
- ❌ Generate `.spec.ts` Playwright test files
- ❌ Compile to JavaScript
- ❌ Use Playwright's native test runner

**What we DO**:
- ✅ Parse `.ox.test` files at runtime
- ✅ Interpret commands dynamically
- ✅ Use custom test runner built on Playwright library

### Benefits of This Approach

| Benefit | Description |
|---------|-------------|
| **Flexibility** | Can edit `.ox.test` files without recompilation |
| **Fast iteration** | Change command, re-run immediately |
| **No build step** | Execution phase has no compilation overhead |
| **Simple pipeline** | YAML → .ox.test → execution (no intermediate .ts/.js) |
| **Clear separation** | AI outputs human format, executor interprets |

### Implementation Details

**Parser** (runs at execution time):
```typescript
class OxtestParser {
  parse(filePath: string): OxtestCommand[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const commands: OxtestCommand[] = [];

    for (const line of content.split('\n')) {
      if (line.trim().startsWith('#') || !line.trim()) continue;
      commands.push(this.parseLine(line));
    }

    return commands;
  }
}
```

**Executor** (interprets commands):
```typescript
class OxtestExecutor {
  async execute(commands: OxtestCommand[]): Promise<ExecutionResult> {
    for (const cmd of commands) {
      await this.executeCommand(cmd);
    }
  }
}
```

**No code generation step** - interpretation is direct and immediate.

---

## Decision 2: LLM Strategy for Decomposition

**Question**: Should we use single-shot decomposition or iterative refinement?

### ✅ Decision: B. Iterative Refinement

**Rationale**: The LLM iteratively explores the page and refines its understanding to generate correct commands.

### Implementation Specification

**Iterative Refinement Process**:

```
For each YAML job:
  1. Initial Decomposition
     - Send job prompt to LLM
     - Get initial understanding of steps needed

  2. Iterative Exploration (loop):
     a. LLM reads current page state (HTML/DOM)
     b. LLM analyzes: "What action is needed next?"
     c. LLM generates oxtest command
     d. System validates command syntax
     e. LLM evaluates: "Will this work?"
     f. If uncertain, LLM refines command
     g. Record command in .ox.test file
     h. LLM simulates result (updates mental model)
     i. Check if acceptance criteria met
     j. If not met, continue loop
     k. If met, job complete

  3. Validation
     - Check all acceptance criteria covered
     - Verify command sequence makes sense
     - If issues found, refine specific commands

  4. Output .ox.test file
```

### Multi-Pass Refinement

**Pass 1: Initial Analysis**
```
LLM Input:
- Job prompt: "Login to shop with username=admin"
- Acceptance: "you are on the home page"
- Initial page HTML (simplified)

LLM Output:
Analysis: "Need to navigate, enter credentials, submit form"
Rough plan: [navigate, type username, type password, click button]
```

**Pass 2: Command Generation with Refinement**
```
For each step in plan:
  LLM Input:
  - Current step: "type username"
  - Current page HTML
  - Previous commands generated

  LLM Initial:
  - Generate: type css=input value=admin

  LLM Refinement:
  - Check: "Which input? There are multiple"
  - Refine: type css=input[name="username"] value=admin

  LLM Validation:
  - Check: "Does this element exist in HTML?"
  - Confirm: "Yes, found in HTML"
  - Output: type css=input[name="username"] value=admin
```

**Pass 3: Validation and Adjustment**
```
LLM Input:
- Generated commands: [navigate, type username, type password, click]
- Acceptance criteria: "you are on the home page"

LLM Analysis:
- "After click, need to wait for navigation"
- "Need to validate we're on home page"

LLM Adds:
- wait_navigation timeout=5000
- assert_url pattern=.*/home

Final sequence validated and complete.
```

### Benefits of Iterative Refinement

| Benefit | Description |
|---------|-------------|
| **Higher accuracy** | LLM refines commands based on actual page structure |
| **Self-correction** | LLM catches its own mistakes during analysis |
| **Better selectors** | LLM verifies selectors exist before finalizing |
| **Complete coverage** | Ensures all acceptance criteria addressed |
| **Robust output** | Multiple validation passes reduce errors |

### Error Handling

**If refinement fails after max iterations** (e.g., 10 passes):
1. Log the incomplete command sequence
2. Report what was achieved
3. Report what's missing
4. Exit with error
5. User can review and manually complete `.ox.test` file

### Implementation Details

```typescript
class IterativeDecompositionEngine {
  async decompose(job: JobDefinition): Promise<string> {
    // Pass 1: Initial analysis
    const plan = await this.llm.query({
      system: this.getSystemPrompt(),
      user: `Analyze this job and create a high-level plan:\n${job.prompt}\nAcceptance: ${job.acceptance}`
    });

    const commands: string[] = [];
    let currentState = this.getInitialPageState();

    // Pass 2: Iterative command generation
    for (const step of plan.steps) {
      let command = await this.generateCommand(step, currentState);

      // Refinement loop
      for (let i = 0; i < 3; i++) {
        const validation = await this.validateCommand(command, currentState);

        if (validation.valid) break;

        command = await this.refineCommand(
          command,
          validation.issues,
          currentState
        );
      }

      commands.push(command);
      currentState = this.simulateCommand(command, currentState);
    }

    // Pass 3: Final validation
    const finalValidation = await this.validateSequence(
      commands,
      job.acceptance
    );

    if (!finalValidation.complete) {
      const additionalCommands = await this.generateMissingCommands(
        finalValidation.missing
      );
      commands.push(...additionalCommands);
    }

    return commands.join('\n');
  }
}
```

---

## Decision 3: State Management Between Tasks

**Question**: How to pass data between tasks (e.g., session state, extracted values)?

### ✅ Decision: Shared Context Object

**Rationale**: Single actor, single browser, single session - shared context throughout test execution.

### Implementation Specification

**Context Object**:
```typescript
interface ExecutionContext {
  // Browser state
  readonly page: Page;
  readonly browser: Browser;
  readonly context: BrowserContext;

  // Session data (persists across commands)
  readonly variables: Map<string, string>;
  readonly cookies: Cookie[];
  readonly localStorage: Record<string, string>;
  readonly sessionStorage: Record<string, string>;

  // Test metadata
  readonly testId: string;
  readonly startTime: Date;
  readonly config: TestConfiguration;

  // Extracted data (from previous commands)
  readonly extractedData: Map<string, unknown>;

  // Methods
  setVariable(name: string, value: string): void;
  getVariable(name: string): string | undefined;
  extractData(name: string, value: unknown): void;
  getData(name: string): unknown;
}
```

### Key Principle: Single Actor, Single Session

**Throughout one test execution**:
- ✅ Same browser instance
- ✅ Same browser context (cookies, storage persist)
- ✅ Same page object (navigation changes page, but object remains)
- ✅ Variables accessible across all commands
- ✅ Extracted data available to subsequent commands

**Example**:
```qc
# Login (sets up session)
navigate url=https://myshop.com/login
type css=input[name="username"] value=${TEST_USERNAME}
type css=input[name="password"] value=${TEST_PASSWORD}
click css=button[type="submit"]

# Session persists automatically (cookies saved in context)
# Navigate to different page - still logged in
navigate url=https://myshop.com/account

# Extract data for later use
get_text css=.user-name store_as=logged_in_user
log message="Logged in as: ${logged_in_user}"

# Add to cart - session still valid
navigate url=https://myshop.com/products/123
click css=button.add-to-cart

# Extract order number
get_text css=.order-number store_as=order_id

# Use extracted data in assertion
assert_text css=.order-confirmation contains="${order_id}"

# Check database using extracted order ID
db_query sql="SELECT * FROM orders WHERE order_number='${order_id}'" store_as=order_data
```

### Context Lifetime

**Context is created**: At start of test execution
**Context persists**: Throughout all commands in the test
**Context is destroyed**: After test completes (or fails)

**Each test gets its own context** - tests are isolated from each other.

### Implementation Details

```typescript
class OxtestExecutor {
  private context: ExecutionContext;

  async execute(commands: OxtestCommand[]): Promise<ExecutionResult> {
    // Initialize context once
    this.context = await this.initializeContext();

    try {
      for (const cmd of commands) {
        await this.executeCommand(cmd, this.context);
      }

      return { success: true };
    } finally {
      // Cleanup context
      await this.cleanupContext(this.context);
    }
  }

  private async executeCommand(
    cmd: OxtestCommand,
    context: ExecutionContext
  ): Promise<void> {
    switch (cmd.command) {
      case 'type':
        // Resolve variables from context
        const value = this.resolveVariables(cmd.params.value, context);
        await context.page.locator(cmd.selector!.value).fill(value);
        break;

      case 'get_text':
        // Extract and store in context
        const text = await context.page.locator(cmd.selector!.value).textContent();
        context.extractData(cmd.params.store_as, text);
        break;

      case 'navigate':
        // Navigation changes page content, but context persists
        // Cookies, localStorage automatically maintained
        await context.page.goto(cmd.params.url);
        break;
    }
  }

  private resolveVariables(value: string, context: ExecutionContext): string {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      // Try environment variables first
      const envVar = process.env[varName];
      if (envVar) return envVar;

      // Try context variables
      const contextVar = context.getVariable(varName);
      if (contextVar) return contextVar;

      // Try extracted data
      const data = context.getData(varName);
      if (data !== undefined) return String(data);

      // Not found, return as-is
      return match;
    });
  }
}
```

### Variable Resolution Order

When encountering `${VAR_NAME}`:
1. Check environment variables (`process.env.VAR_NAME`)
2. Check context variables (set via `set var=VAR_NAME value=...`)
3. Check extracted data (set via `store_as=VAR_NAME`)
4. If not found, leave as-is (or error, depending on configuration)

### Benefits of Shared Context

| Benefit | Description |
|---------|-------------|
| **Natural flow** | Matches real user behavior (one session) |
| **Simple** | No complex state passing between tasks |
| **Browser-native** | Cookies/storage work automatically |
| **Data extraction** | Easy to capture and reuse values |
| **Debugging** | Can inspect entire context at any point |

---

## Decision 4: Async Execution Model

**Question**: Should commands execute sequentially or in parallel?

### ✅ Decision: C. Sequential (Current)

**Rationale**: Simple, predictable, easier debugging. Browser automation is inherently sequential.

### Implementation Specification

**Execution Model**: Strict sequential, one command at a time.

```typescript
class OxtestExecutor {
  async execute(commands: OxtestCommand[]): Promise<ExecutionResult> {
    const results: CommandResult[] = [];

    // Sequential execution with await
    for (const cmd of commands) {
      try {
        const result = await this.executeCommand(cmd);
        results.push({ command: cmd, success: true, result });
      } catch (error) {
        results.push({ command: cmd, success: false, error });

        // Stop on first error
        break;
      }
    }

    return { results };
  }
}
```

### Execution Order Guarantees

**Guaranteed**:
- ✅ Commands execute in the order written in `.ox.test` file
- ✅ Command N+1 starts only after command N completes
- ✅ Command N+1 sees all effects of command N
- ✅ Errors stop execution immediately
- ✅ Context state is consistent at each step

**Not supported** (in Phase 1):
- ❌ Parallel execution of independent commands
- ❌ Background commands
- ❌ Command racing
- ❌ Concurrent browser contexts

### Why Sequential?

**Browser Interaction Is Sequential**:
- User clicks button → waits for response → sees result
- User types text → sees it appear → continues
- Navigation changes page → must wait → then interact

**Debugging Is Easier**:
- Step through commands one by one
- Know exact state at each point
- Reproduce issues reliably

**Simplicity**:
- No race conditions
- No deadlocks
- No complex synchronization
- Clear cause and effect

### Example Sequential Flow

```qc
# Command 1
navigate url=https://myshop.com
# Wait for command 1 to complete before command 2

# Command 2
click css=button.open-modal
# Wait for modal to appear before command 3

# Command 3
wait css=.modal state=visible timeout=5000
# Wait for modal visibility before command 4

# Command 4
type css=.modal input[name="email"] value=test@example.com
# Complete typing before command 5

# Command 5
click css=.modal button.submit
# Submit completes before command 6

# Command 6
wait_navigation timeout=5000
# Navigation completes before command 7

# Command 7
assert_url pattern=.*/success
# Each step happens in order, guaranteed
```

### Implementation Details

```typescript
class SequentialExecutor {
  async execute(commands: OxtestCommand[]): Promise<void> {
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      this.logger.info(`Executing command ${i + 1}/${commands.length}: ${cmd.command}`);

      const startTime = Date.now();

      try {
        await this.executeCommand(cmd);

        const duration = Date.now() - startTime;
        this.logger.info(`Command completed in ${duration}ms`);

      } catch (error) {
        this.logger.error(`Command failed:`, error);

        // Stop execution on error
        throw new Error(
          `Command ${i + 1} failed: ${cmd.command}\n` +
          `Error: ${error.message}`
        );
      }
    }
  }
}
```

### Future Consideration: Parallel Execution

**In Phase 3**, we may add optional parallel execution:

```qc
# Parallel block (future feature)
parallel {
  screenshot path=./page1.png
  log message="Taking screenshot"
}

# But browser commands remain sequential
click css=button  # Must finish before next command
type css=input value=text  # Strict order maintained
```

**For Phase 1 MVP**: Sequential only. Keep it simple.

---

## Decision 5: Selector Generation Strategy

**Question**: Should AI generate selectors, or discover them at runtime?

### ✅ Decision: A. AI-Generated Selectors (Current)

**Rationale**: LLM analyzes page HTML during compilation and generates selectors that are embedded in oxtest.

### Implementation Specification

**During Compilation** (LLM generates selectors):

```
LLM Input:
- Job prompt: "Click login button"
- Page HTML: <html>...<button class="btn-login" type="submit">Login</button>...</html>

LLM Analysis:
- "Need to click a button"
- "Found button with class 'btn-login' and text 'Login'"
- "Generate selector: css=button.btn-login"
- "Add fallback: text='Login'"

LLM Output (oxtest):
click css=button.btn-login fallback=text="Login"
```

**Selectors are embedded in `.ox.test` file**:
```qc
# Selectors generated during compilation
type css=input[name="username"] value=${USER}
type css=input[type="password"] value=${PASS}
click css=button.btn-login fallback=text="Login"
```

**During Execution** (selectors used directly):
```typescript
// Executor uses pre-generated selectors from .ox.test file
const selector = cmd.selector; // css=button.btn-login
const locator = page.locator(selector.value);
await locator.click();

// If fails, try fallback
if (cmd.selector.fallback) {
  const fallbackLocator = this.locateByStrategy(cmd.selector.fallback);
  await fallbackLocator.click();
}
```

### Multi-Strategy Selectors with Fallbacks

**LLM generates multiple strategies** when possible:

```qc
# Primary selector + fallback
click css=button[type="submit"] fallback=text="Login"

# Multiple fallbacks (future)
click css=button.submit fallback1=text="Login" fallback2=role=button name="Login"
```

### Selector Quality Criteria

**LLM considers** when generating selectors:

1. **Specificity**: Unique enough to find correct element
2. **Stability**: Unlikely to break with minor UI changes
3. **Semantics**: Prefers semantic attributes (name, type, role)
4. **Text content**: Uses visible text when stable
5. **Structure**: Considers DOM hierarchy

**Priority order** (LLM taught to prefer):
1. `name` attribute: `css=input[name="username"]`
2. `type` attribute: `css=input[type="email"]`
3. `data-testid`: `testid=login-button`
4. Stable classes: `css=button.primary-action`
5. Text content: `text="Submit Order"`
6. ARIA roles: `role=button name="Login"`
7. Complex CSS: `css=.modal .form button.submit` (last resort)

### Example: LLM Selector Generation Process

**Job prompt**: "Enter email address"

**LLM sees HTML**:
```html
<div class="form-group">
  <label for="email">Email Address</label>
  <input
    id="email"
    name="email"
    type="email"
    placeholder="Enter your email"
    class="form-control"
  />
</div>
```

**LLM reasoning**:
```
Option 1: css=input[name="email"]        ← Best (semantic, stable)
Option 2: css=input[type="email"]        ← Good (semantic)
Option 3: css=input#email                ← Good (unique ID)
Option 4: placeholder="Enter your email" ← OK (text may change)
Option 5: css=.form-control              ← Bad (not unique)

Primary: name attribute (most stable)
Fallback: type attribute (semantic backup)
```

**LLM generates**:
```qc
type css=input[name="email"] value=${EMAIL}
# Or with fallback:
type css=input[name="email"] fallback=css=input[type="email"] value=${EMAIL}
```

### Benefits of AI-Generated Selectors

| Benefit | Description |
|---------|-------------|
| **Fast execution** | Selectors pre-computed, no runtime discovery |
| **Deterministic** | Same `.ox.test` file = same selectors |
| **Human-readable** | Can see and edit selectors in `.ox.test` file |
| **Smart choices** | LLM considers stability and semantics |
| **Fallback support** | Multiple strategies for robustness |

### Handling Selector Failures

**If primary selector fails during execution**:

```typescript
async findElement(selectorSpec: SelectorSpec): Promise<Locator> {
  try {
    // Try primary selector
    const locator = this.locateByStrategy(selectorSpec);
    await locator.waitFor({ state: 'attached', timeout: 5000 });
    return locator;

  } catch (error) {
    // Primary failed, try fallback
    if (selectorSpec.fallback) {
      this.logger.warn(`Primary selector failed, trying fallback`);
      return this.locateByStrategy(selectorSpec.fallback);
    }

    throw new Error(
      `Element not found: ${selectorSpec.strategy}=${selectorSpec.value}`
    );
  }
}
```

**User can fix** by editing `.ox.test` file:
```qc
# Before (generated by LLM, now broken)
click css=button.old-class

# After (manually updated)
click css=button.new-class

# Or add fallback
click css=button.new-class fallback=text="Login"
```

**No recompilation needed** - just edit and re-run.

### Validation During Compilation

**LLM validates selectors** before finalizing:

```
LLM Process:
1. Generate selector: css=input[name="username"]
2. Check HTML: Does element exist?
3. Is element unique? (Count matches)
4. If ambiguous, refine selector
5. Generate fallback if unsure
6. Output final selector to .ox.test file
```

This reduces runtime failures by catching issues during compilation.

---

## Summary of Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **1. Code Generation vs. Interpretation** | ✅ Pure Interpretation | Flexible, editable, no build step |
| **2. LLM Decomposition Strategy** | ✅ Iterative Refinement | Higher accuracy, self-correction |
| **3. State Management** | ✅ Shared Context Object | Natural flow, simple, browser-native |
| **4. Async Execution** | ✅ Sequential | Simple, predictable, easier debugging |
| **5. Selector Generation** | ✅ AI-Generated | Fast execution, deterministic, editable |

---

## Implementation Impact

### Phase 1 MVP Scope (Updated)

**Must implement**:
- ✅ Pure interpretation (no code generation)
- ✅ Iterative refinement engine
- ✅ Shared execution context
- ✅ Sequential command execution
- ✅ AI-generated selectors with fallbacks

**Can defer to Phase 2+**:
- ⏸️ Static code generation (not needed)
- ⏸️ Parallel execution (sequential is sufficient)
- ⏸️ Runtime selector discovery (AI generates upfront)

### Development Priorities

**Week 1-2**:
- Implement `ExecutionContext` class
- Implement `OxtestParser` (sequential)
- Implement `SequentialExecutor`

**Week 3-4**:
- Implement `IterativeDecompositionEngine`
- LLM prompts for selector generation
- Validation and refinement loops

**Week 5-6**:
- Integration testing
- End-to-end workflow testing
- Documentation and examples

---

## Next Steps

1. ✅ **Decisions finalized** (this document)
2. 🚀 **Begin implementation** following these specifications
3. 📝 **Update 00-4-technical-decisions-and-roadmap.md** to reflect closed questions
4. 🧪 **Write tests** for each decision's implementation
5. 📚 **Document examples** showing each decision in practice

---

## References

- [00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md) - Original open questions
- [00-6: Iterative Execution and Oxtest](./00-6-iterative-execution-and-oxtest.md) - Oxtest specification
- [00-2: Layered Architecture](./00-2-layered-architecture.md) - Architecture design
- [00-3: Infrastructure and Execution](./00-3-infrastructure-and-execution.md) - Implementation details
