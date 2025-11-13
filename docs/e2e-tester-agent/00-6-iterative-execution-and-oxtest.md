# e2e-tester-agent: Iterative Execution and Oxtest

**Version**: 1.0
**Date**: November 13, 2025

## Overview

This document describes the **iterative execution model** and **oxtest intermediate representation** that forms the bridge between AI interpretation and mechanical execution.

## The Iterative Discovery Process

### Problem Statement

When executing a natural language prompt like "Login to shop", the system doesn't know in advance:
- Where is the username field?
- What selector will work?
- Is it an input, or a custom component?
- Will clicking work, or do we need to hover first?

### Solution: Iterative HTML Analysis

The AI agent **iteratively explores the page** to find the correct commands:

```
1. Read current HTML/DOM state
2. Analyze what actions are possible
3. Choose next action (click, hover, type, keypress)
4. Execute action
5. Read new HTML/DOM state
6. Determine if goal achieved
7. If not → go to step 2
8. If yes → record successful sequence
```

### Example: Login Flow Discovery

**User Prompt**: "Login to shop with username=admin password=secret"

**Iteration 1**:
```
AI reads HTML → sees login form
AI decides: "Need to fill username field"
AI generates command: type selector=input[name="username"] value=admin
Execute command → Success
```

**Iteration 2**:
```
AI reads HTML → sees password field
AI decides: "Need to fill password field"
AI generates command: type selector=input[name="password"] value=secret
Execute command → Success
```

**Iteration 3**:
```
AI reads HTML → sees submit button
AI decides: "Need to click submit"
AI generates command: click selector=button[type="submit"]
Execute command → Success
```

**Iteration 4**:
```
AI reads HTML → sees homepage
AI decides: "Login complete, on homepage"
AI validates: URL changed, no error messages
Result: SUCCESS
```

**Output**: Sequence of commands that successfully logged in

---

## Oxtest: The Intermediate Representation

### What is Oxtest?

**Oxtest** is a simple, human-readable command language that sits between natural language prompts and Playwright API calls.

**Characteristics**:
- **Human-readable**: Easy to understand and modify
- **Simple syntax**: Obvious meaning, no complex rules
- **Pre-generated**: Created during compilation phase
- **Deterministic**: Same oxtest always executes the same way
- **Debuggable**: Can inspect, edit, and re-run without AI

### Why Oxtest?

| Stakeholder | Benefit |
|-------------|---------|
| **Developers** | Can read and understand test logic without running it |
| **QA Engineers** | Can manually tweak commands without re-compiling |
| **CI/CD** | Fast execution without LLM calls |
| **Debuggers** | Can add breakpoints, step through commands |
| **Maintainers** | Can update commands when UI changes |

---

## Oxtest Syntax

### Design Principles

1. **Obvious**: Keywords match their meaning (`click`, `type`, `wait`)
2. **Simple**: No complex grammar or nesting
3. **Readable**: Looks like pseudocode, not a programming language
4. **Extensible**: Easy to add new commands

### Command Format

```
command_name selector_strategy=selector_value [param=value ...]
```

**Components**:
- `command_name`: Action to perform (click, type, hover, etc.)
- `selector_strategy`: How to find element (css, xpath, text, role, etc.)
- `selector_value`: The actual selector
- `param=value`: Additional parameters

### Example Oxtest File

**File**: `_generated/login-test.ox.test` (oxtest)

```qc
# Login Test - Generated from YAML
# Source: demo-compulable-inception.yaml
# Job: login
# Compiled: 2025-11-13T10:00:00Z

# Navigate to shop
navigate url=https://oxideshop.dev

# Wait for page load
wait selector=css=body.loaded timeout=5000

# Fill username
type css=input[name="username"] value=${TEST_USERNAME}

# Fill password
type css=input[type="password"] value=${TEST_PASSWORD}

# Click login button
click text="Login" fallback=css=button[type="submit"]

# Wait for navigation
wait_navigation timeout=5000

# Validate: on home page
assert_url pattern=.*/home message="Should be on home page"

# Validate: no errors visible
assert_not_exists css=.error,.alert-error message="No error messages should be visible"

# Take screenshot for documentation
screenshot path=./screenshots/login-success.png

# Mark test as passed
pass message="Login successful"
```

---

## Oxtest Command Reference

### Navigation Commands

```qc
# Navigate to URL
navigate url=<url> [wait_until=networkidle|load|domcontentloaded]

# Go back
back

# Go forward
forward

# Reload page
reload [wait_until=networkidle]

# Wait for navigation to occur
wait_navigation [timeout=5000]
```

### Element Interaction Commands

```qc
# Click element
click <selector> [button=left|right|middle] [click_count=1] [timeout=5000]

# Double click
dblclick <selector> [timeout=5000]

# Right click
rightclick <selector> [timeout=5000]

# Hover over element
hover <selector> [timeout=5000]

# Type text into element
type <selector> value=<text> [delay=0] [clear=true]

# Press keyboard key
press <selector> key=<key> [delay=0]

# Select option from dropdown
select <selector> value=<value>

# Check checkbox
check <selector>

# Uncheck checkbox
uncheck <selector>

# Upload file
upload <selector> file=<path>

# Focus element
focus <selector>

# Blur (unfocus) element
blur <selector>
```

### Wait Commands

```qc
# Wait for element to exist
wait <selector> [state=visible|attached|detached|hidden] [timeout=5000]

# Wait for specific time
wait_time milliseconds=<ms>

# Wait for element to be visible
wait_visible <selector> [timeout=5000]

# Wait for element to be hidden
wait_hidden <selector> [timeout=5000]

# Wait for function to return true
wait_function script=<js> [timeout=5000]
```

### Assertion Commands

```qc
# Assert element exists
assert_exists <selector> [message=<msg>]

# Assert element does not exist
assert_not_exists <selector> [message=<msg>]

# Assert element is visible
assert_visible <selector> [message=<msg>]

# Assert element is hidden
assert_hidden <selector> [message=<msg>]

# Assert element text contains
assert_text <selector> contains=<text> [message=<msg>]

# Assert element text equals
assert_text <selector> equals=<text> [message=<msg>]

# Assert element count
assert_count <selector> count=<number> [message=<msg>]

# Assert URL matches pattern
assert_url pattern=<regex> [message=<msg>]

# Assert title contains
assert_title contains=<text> [message=<msg>]

# Assert custom condition
assert_condition script=<js> [message=<msg>]
```

### Database Commands

```qc
# Watch database for condition
db_watch table=<table> field=<field> condition=<not_empty|equals|contains> [value=<val>] [timeout=5000]

# Query database and store result
db_query sql=<query> store_as=<var>

# Assert database condition
db_assert table=<table> field=<field> condition=<condition> [value=<val>]
```

### Utility Commands

```qc
# Take screenshot
screenshot path=<path> [full_page=true]

# Log message
log message=<text> [level=info|warn|error]

# Set variable
set var=<name> value=<value>

# Get element text and store
get_text <selector> store_as=<var>

# Get element attribute and store
get_attribute <selector> name=<attr> store_as=<var>

# Execute JavaScript
execute script=<js> [store_as=<var>]

# Pause execution (for debugging)
pause [message=<msg>]

# Mark test as passed
pass [message=<msg>]

# Mark test as failed
fail message=<msg>
```

### Selector Strategies

Oxtest supports multiple selector strategies:

```qc
# CSS selector
click css=button.submit

# XPath selector
click xpath=//button[@type="submit"]

# Text content
click text="Login"

# ARIA role with name
click role=button name="Login"

# Test ID
click testid=login-button

# Placeholder text
type placeholder="Enter username" value=admin

# Label text
type label="Username" value=admin

# Multiple strategies with fallback
click text="Login" fallback=css=button[type="submit"]
```

---

## Two-Phase Execution Model

### Phase 1: Compilation (AI-Driven)

**Command**: `npm run e2e-test-compile --src=test.yaml --output=_generated`

**Process**:
```
1. Parse YAML file
2. For each job:
   a. Send prompt to LLM
   b. LLM iteratively explores:
      - "Read current page HTML"
      - "What actions are needed?"
      - "Generate next command"
      - "Will this work?"
   c. LLM generates sequence of oxtest commands
   d. Validate oxtest syntax
   e. Write .ox.test file to _generated/
3. Generate manifest file with all tests
```

**Output**: Directory structure
```
_generated/
├── manifest.json           # List of all test files
├── login-test.ox.test          # Oxtest for login job
├── shopping-test.ox.test       # Oxtest for shopping job
├── checkout-test.ox.test       # Oxtest for checkout job
└── payment-test.ox.test        # Oxtest for payment job
```

**Manifest.json**:
```json
{
  "compiled_at": "2025-11-13T10:00:00Z",
  "source": "demo-compulable-inception.yaml",
  "version": "1.0.0",
  "tests": [
    {
      "id": "login-test",
      "file": "login-test.ox.test",
      "name": "Login to shop",
      "estimated_duration": 5000
    },
    {
      "id": "shopping-test",
      "file": "shopping-test.ox.test",
      "name": "Add products to cart",
      "estimated_duration": 8000
    }
  ]
}
```

### Phase 2: Execution (Deterministic)

**Command**: `npm run e2e-test-run _generated`

**Process**:
```
1. Load manifest.json
2. For each test file:
   a. Parse .ox.test file
   b. Validate syntax
   c. Initialize Playwright browser
   d. Execute commands sequentially:
      - Parse command line
      - Resolve variables (${TEST_USERNAME})
      - Find element using selector
      - Perform action
      - Validate result
      - Log outcome
   e. Capture screenshots on failure
   f. Generate test report
3. Aggregate all results
4. Generate HTML/JUnit reports
```

**Output**:
- Test execution logs
- Screenshots
- HTML report
- JUnit XML

---

## Iterative Discovery During Compilation

### How LLM Explores the Page

When compiling a job like "Login to shop", the LLM follows this loop:

**Step 1: Analyze Current State**
```
LLM Input:
- Job prompt: "Login to shop with username=admin"
- Current page HTML (simplified)
- Previously generated commands
- Acceptance criteria

LLM Output:
- Analysis: "Need to navigate to login page first"
- Next command: navigate url=https://oxideshop.dev/login
```

**Step 2: Execute and Read Result**
```
Execute: navigate url=https://oxideshop.dev/login
Read HTML: Page now shows login form with username/password fields
```

**Step 3: Decide Next Action**
```
LLM Input:
- Job prompt: "Login to shop with username=admin"
- New page HTML (with login form)
- Commands so far: [navigate]
- Goal: Login not yet complete

LLM Output:
- Analysis: "Login form visible, need to fill username"
- Next command: type css=input[name="username"] value=admin
```

**Step 4: Continue Until Goal Met**
```
Repeat until:
- Acceptance criteria met ("you are on the home page")
- Or max iterations reached (safety limit)
- Or LLM decides goal achieved
```

### Example: Complex Interaction Discovery

**Prompt**: "Add 2 products to cart"

**LLM Exploration**:

```
Iteration 1:
  Read: Homepage with product listings
  Decide: "Need to find 'Add to Cart' button for first product"
  Command: hover css=.product:first-child

Iteration 2:
  Read: Hover revealed 'Add to Cart' button
  Decide: "Button now visible, click it"
  Command: click css=.product:first-child button.add-to-cart

Iteration 3:
  Read: Popup appeared, cart counter shows "1"
  Decide: "Successfully added 1 product, need 1 more"
  Command: wait_time milliseconds=500

Iteration 4:
  Read: Popup dismissed
  Decide: "Need to find second product"
  Command: hover css=.product:nth-child(2)

Iteration 5:
  Read: Second product 'Add to Cart' visible
  Decide: "Click second product's button"
  Command: click css=.product:nth-child(2) button.add-to-cart

Iteration 6:
  Read: Cart counter shows "2"
  Decide: "Goal achieved: 2 products in cart"
  Command: assert_text css=.cart-counter equals="2"

Final: Generate .ox.test file with 6 commands
```

---

## Oxtest Parser and Executor

### Parser Architecture

```typescript
interface OxtestCommand {
  readonly line: number;
  readonly command: string;
  readonly selector?: SelectorSpec;
  readonly params: Record<string, string>;
}

interface SelectorSpec {
  readonly strategy: 'css' | 'xpath' | 'text' | 'role' | 'testid' | 'placeholder' | 'label';
  readonly value: string;
  readonly fallback?: SelectorSpec;
}

class OxtestParser {
  parse(content: string): OxtestCommand[] {
    const commands: OxtestCommand[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (line.startsWith('#') || line === '') continue;

      const command = this.parseLine(line, i + 1);
      commands.push(command);
    }

    return commands;
  }

  private parseLine(line: string, lineNumber: number): OxtestCommand {
    // Split by whitespace, respecting quotes
    const tokens = this.tokenize(line);
    const command = tokens[0];

    // Parse selector (if first token after command doesn't contain '=')
    let selector: SelectorSpec | undefined;
    let paramStart = 1;

    if (tokens.length > 1 && !tokens[1].includes('=')) {
      selector = this.parseSelector(tokens[1]);
      paramStart = 2;
    }

    // Parse parameters
    const params: Record<string, string> = {};
    for (let i = paramStart; i < tokens.length; i++) {
      const [key, value] = tokens[i].split('=', 2);
      params[key] = value;
    }

    return { line: lineNumber, command, selector, params };
  }

  private parseSelector(token: string): SelectorSpec {
    // Check if it's a strategy=value format
    if (token.includes('=')) {
      const [strategy, value] = token.split('=', 2);
      return {
        strategy: strategy as any,
        value: this.unquote(value)
      };
    }

    // Default to CSS selector
    return {
      strategy: 'css',
      value: this.unquote(token)
    };
  }

  private tokenize(line: string): string[] {
    // Tokenize respecting quotes
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuote) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) tokens.push(current);

    return tokens;
  }

  private unquote(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }
}
```

### Executor Architecture

```typescript
class OxtestExecutor {
  constructor(
    private readonly page: Page,
    private readonly variables: Map<string, string>,
    private readonly logger: ILogger
  ) {}

  async execute(commands: OxtestCommand[]): Promise<ExecutionResult> {
    const results: CommandResult[] = [];

    for (const cmd of commands) {
      this.logger.info(`Executing: ${cmd.command}`, { line: cmd.line });

      try {
        const result = await this.executeCommand(cmd);
        results.push({ command: cmd, success: true, result });
      } catch (error) {
        this.logger.error(`Command failed: ${cmd.command}`, { error });
        results.push({ command: cmd, success: false, error: error as Error });

        // Stop on failure (or continue based on configuration)
        break;
      }
    }

    return {
      totalCommands: commands.length,
      executedCommands: results.length,
      successfulCommands: results.filter(r => r.success).length,
      failedCommands: results.filter(r => !r.success).length,
      results
    };
  }

  private async executeCommand(cmd: OxtestCommand): Promise<unknown> {
    switch (cmd.command) {
      case 'navigate':
        return this.navigate(cmd.params);

      case 'click':
        return this.click(cmd.selector!, cmd.params);

      case 'type':
        return this.type(cmd.selector!, cmd.params);

      case 'wait':
        return this.wait(cmd.selector!, cmd.params);

      case 'assert_url':
        return this.assertUrl(cmd.params);

      case 'assert_not_exists':
        return this.assertNotExists(cmd.selector!, cmd.params);

      case 'screenshot':
        return this.screenshot(cmd.params);

      // ... other commands

      default:
        throw new Error(`Unknown command: ${cmd.command}`);
    }
  }

  private async navigate(params: Record<string, string>): Promise<void> {
    const url = this.resolveVariables(params.url);
    const waitUntil = (params.wait_until || 'networkidle') as any;
    await this.page.goto(url, { waitUntil });
  }

  private async click(selector: SelectorSpec, params: Record<string, string>): Promise<void> {
    const locator = await this.findElement(selector);
    const timeout = parseInt(params.timeout || '5000');
    await locator.click({ timeout });
  }

  private async type(selector: SelectorSpec, params: Record<string, string>): Promise<void> {
    const locator = await this.findElement(selector);
    const value = this.resolveVariables(params.value);

    if (params.clear === 'true') {
      await locator.clear();
    }

    await locator.fill(value);
  }

  private async findElement(selector: SelectorSpec): Promise<Locator> {
    try {
      return this.locateByStrategy(selector);
    } catch (error) {
      if (selector.fallback) {
        this.logger.warn(`Primary selector failed, trying fallback`);
        return this.locateByStrategy(selector.fallback);
      }
      throw error;
    }
  }

  private locateByStrategy(selector: SelectorSpec): Locator {
    switch (selector.strategy) {
      case 'css':
        return this.page.locator(selector.value);

      case 'xpath':
        return this.page.locator(`xpath=${selector.value}`);

      case 'text':
        return this.page.getByText(selector.value);

      case 'role':
        return this.page.getByRole(selector.value as any);

      case 'testid':
        return this.page.getByTestId(selector.value);

      case 'placeholder':
        return this.page.getByPlaceholder(selector.value);

      case 'label':
        return this.page.getByLabel(selector.value);

      default:
        throw new Error(`Unknown selector strategy: ${selector.strategy}`);
    }
  }

  private resolveVariables(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return this.variables.get(varName) || match;
    });
  }
}
```

---

## Benefits of This Approach

### 1. Human-Readable Intermediate Format

**Before (Direct Playwright)**:
```typescript
await page.goto('https://oxideshop.dev');
await page.locator('input[name="username"]').fill(process.env.TEST_USERNAME);
await page.locator('input[type="password"]').fill(process.env.TEST_PASSWORD);
await page.locator('button[type="submit"]').click();
```

**After (Oxtest)**:
```qc
navigate url=https://oxideshop.dev
type css=input[name="username"] value=${TEST_USERNAME}
type css=input[type="password"] value=${TEST_PASSWORD}
click css=button[type="submit"]
```

**Winner**: Oxtest is clearer and more concise

### 2. Easy to Update and Maintain

**Scenario**: UI changes, username field selector changes

**Oxtest Approach**:
1. Open `login-test.ox.test`
2. Change line: `type css=input[name="username"]` → `type css=input[id="user"]`
3. Re-run: `npm run e2e-test-run _generated`
4. No AI needed, no recompilation

**Direct Approach**:
1. Re-run compilation (LLM call)
2. Hope LLM generates correct new selector
3. Or manually edit generated TypeScript (messy)

### 3. Fast Execution (No LLM Latency)

**Oxtest Execution**:
- Read `.ox.test` file: 1ms
- Parse commands: 10ms
- Execute commands: 5s (actual browser time)
- **Total**: 5.01s

**Alternative (Real-time AI)**:
- LLM call for each step: 500ms × 10 steps = 5s
- Execute commands: 5s
- **Total**: 10s

**Savings**: 50% faster

### 4. Version Control Friendly

**Git Diff** for oxtest changes:
```diff
# login-test.ox.test
  navigate url=https://oxideshop.dev
- type css=input[name="username"] value=${TEST_USERNAME}
+ type css=input[id="user-field"] value=${TEST_USERNAME}
  type css=input[type="password"] value=${TEST_PASSWORD}
```

**Clear what changed**: Selector updated

### 5. Debugging with Standard Tools

```bash
# Add a pause command for debugging
vim _generated/login-test.ox.test

# Add line:
pause message="Check username field"

# Re-run
npm run e2e-test-run _generated

# Execution stops, you can inspect browser
```

### 6. Portable and Shareable

- `.ox.test` files are plain text
- Can be checked into version control
- Can be shared across teams
- No runtime dependencies except executor
- Can be edited with any text editor

---

## Workflow Summary

### Complete Two-Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Compilation (AI-Driven, Run Once)                 │
└─────────────────────────────────────────────────────────────┘

User writes:  test.yaml (natural language prompts)
                ↓
Run:         npm run e2e-test-compile --src=test.yaml --output=_generated
                ↓
LLM Process: Iterative discovery
             1. Read page HTML
             2. Analyze what actions needed
             3. Generate oxtest command
             4. Simulate execution
             5. Read new state
             6. Repeat until goal met
                ↓
Output:      _generated/*.ox.test (oxtest files)
             _generated/manifest.json


┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Execution (Deterministic, Run Many Times)         │
└─────────────────────────────────────────────────────────────┘

Input:       _generated/ directory
                ↓
Run:         npm run e2e-test-run _generated
                ↓
Parse:       .ox.test files → Command objects
                ↓
Execute:     Commands → Playwright actions → Browser
                ↓
Validate:    Assertions → Pass/Fail
                ↓
Output:      HTML report, screenshots, JUnit XML
```

---

## Next Steps

1. **Implement oxtest parser** (Layer 1)
2. **Implement oxtest executor** (Layer 4)
3. **Design LLM prompts for iterative discovery**
4. **Create oxtest syntax validator**
5. **Build debugging tools for .ox.test files**

See [00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md) for full implementation plan.
