# e2e-tester-agent

AI-driven automation framework for end-to-end testing powered by Playwright.

## Overview

e2e-tester-agent is an intelligent test automation tool that combines the power of AI with Playwright to create and execute end-to-end tests. Instead of writing explicit test code, you define test scenarios in YAML files using natural language prompts, and the AI agent handles the actual browser interactions.

## Architecture

The framework consists of multiple layers:

1. **CLI Layer** - Command-line interface for executing tests
2. **AI Processing Layer** - Interprets natural language prompts and generates test actions
3. **Playwright Layer** - Browser automation and interaction
4. **YAML Configuration** - Test scenario definitions

## Installation

```bash
npm install
```

## Usage

The testing process consists of two phases:

### Phase 1: Compile YAML to Oxtest

First, compile your YAML test configuration into oxtest files using AI-driven iterative discovery:

```bash
npm run e2e-test-compile --src=<input-file.yaml> --output=<output-directory>
```

**What happens**:
- LLM reads your natural language prompts
- Iteratively explores the application:
  - Reads HTML/DOM state
  - Decides what action is needed
  - Generates oxtest command
  - Validates approach
  - Repeats until job complete
- Outputs human-readable `.ox.test` (oxtest) files

### Phase 2: Execute Oxtest Tests

Then, run the generated oxtest tests (no LLM required):

```bash
npm run e2e-test-run <output-directory>
```

**What happens**:
- Parses `.ox.test` files into command objects
- Executes commands deterministically with Playwright
- Validates acceptance criteria
- Generates reports

### Parameters

- `--src` - Path to the YAML test configuration file
- `--output` - Directory where generated oxtest files will be saved

### Example

```bash
# Phase 1: Compile the test scenario (AI-driven, run once)
npm run e2e-test-compile --src=demo-compulable-inception.yaml --output=_generated

# Phase 2: Run the generated tests (fast, run many times)
npm run e2e-test-run _generated
```

### Output Structure

```
_generated/
├── manifest.json          # List of all compiled tests
├── login-test.ox.test         # Oxtest for login job
├── shopping-test.ox.test      # Oxtest for shopping job
└── checkout-test.ox.test      # Oxtest for checkout job
```

### Oxtest Example

Example generated file (`login-test.ox.test`):
```qc
# Login to shop - Generated from YAML
navigate url=https://oxideshop.dev
type css=input[name="username"] value=${TEST_USERNAME}
type css=input[type="password"] value=${TEST_PASSWORD}
click text="Login" fallback=css=button[type="submit"]
assert_url pattern=.*/home
```

**Benefits**:
- Human-readable and editable
- Version control friendly
- Fast execution (no LLM calls)
- Easy to debug and maintain

## YAML Configuration Format

Test scenarios are defined in YAML files with the following structure:

```yaml
test-suite-name:
  environment: dev|staging|production
  url: https://your-test-site.com
  timeout: <seconds>
  jobs:
    - name: <job-name>
      prompt: <natural-language-instruction>
      acceptance:
        - <acceptance-criteria>
      on_error:
        try: <fallback-action>
        catch: <error-handling>
```

### Configuration Properties

#### Top Level

- `environment` - Target environment for testing
- `url` - Base URL of the application under test
- `timeout` - Maximum time (in seconds) to wait for actions

#### Job Properties

- `name` - Descriptive name for the test step
- `prompt` - Natural language instruction for the AI agent
  - Can be a simple string
  - Can be a complex object with `prompt_str`, `expected_actions`, and `expected_action_sequence`
- `acceptance` - List of conditions that must be met for the step to pass
  - Can include page state checks
  - Can include database watches (e.g., checking table values)
- `on_error` - Error handling strategy
  - `try` - Alternative action to attempt
  - `catch` - Final fallback or error state

### Environment Variables

Use environment variables in your prompts with the syntax: `${VARIABLE_NAME}`

Example:
```yaml
prompt: Login with username=${TEST_USERNAME} password=${TEST_PASSWORD}
```

### Database Watching

Monitor database state changes with the `watch` acceptance criteria:

```yaml
acceptance:
  - watch:
      - table: <table-name>
      - field: <field-name>
      - assume: <expected-condition>
```

## Example Test Scenario

See [demo-compulable-inception.yaml](./demo-compulable-inception.yaml) for a complete example that demonstrates:

- User authentication with fallback credentials
- Shopping cart interactions
- Product addition with error handling
- Checkout flow
- Payment method selection
- Order placement with database validation

## Features

- **Natural Language Test Definition** - Write tests in plain English
- **AI-Powered Execution** - Intelligent browser interaction without explicit selectors
- **Error Recovery** - Built-in fallback mechanisms with `on_error` handlers
- **Environment Variable Support** - Flexible configuration for different environments
- **Database Validation** - Watch and validate database state changes
- **Playwright Integration** - Robust browser automation foundation

## Requirements

- Node.js (version TBD)
- npm
- Playwright
- Access to target application environment

## Output

The compilation step (`e2e-test-compile`) generates Playwright test files in the directory specified by the `--output` parameter. The execution step (`npm run test`) then produces:

- Test execution logs
- Screenshots on failure
- Test reports
- Any additional Playwright artifacts

## Architecture

This project follows Clean Architecture principles with strict TypeScript, TDD, and SOLID design patterns. For detailed architectural information, see:

- **[00-1: Introduction and Core Challenge](./00-1-introduction-and-challenge.md)** - Development principles (TDD, SOLID, Clean Code) and the fundamental challenge of converting YAML to executable tests
- **[00-2: Layered Architecture](./00-2-layered-architecture.md)** - Five-layer architecture design (Configuration, Domain, Application, Infrastructure, Presentation)
- **[00-3: Infrastructure and Execution](./00-3-infrastructure-and-execution.md)** - Playwright executor, LLM providers, database watchers, and CLI implementation
- **[00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md)** - Key architectural decisions, open questions, implementation phases, and technology stack
- **[00-5: Approach Comparison and Rationale](./00-5-approach-comparison-and-rationale.md)** - Detailed comparison of Direct Code Generation vs. Two-Layer Interpretation approaches with rationale for our choice
- **[00-6: Iterative Execution and Oxtest](./00-6-iterative-execution-and-oxtest.md)** - How LLM iteratively discovers actions and generates human-readable oxtest intermediate representation

### Key Architectural Concepts

**Iterative Discovery**: During compilation, the LLM:
1. Reads current page HTML/DOM state
2. Analyzes what actions are needed to achieve the goal
3. Generates the next oxtest command
4. Validates the approach
5. Repeats until acceptance criteria met

**Oxtest**: Human-readable intermediate representation:
- Simple syntax (e.g., `click css=button.submit`)
- Easy to read, edit, and debug
- Version control friendly
- No LLM required for execution
- Supports multiple selector strategies with fallbacks

**Two-Phase Workflow**:
1. **Phase 1: Compilation (AI-driven, run once)**
   - YAML → LLM (iterative discovery) → Oxtest files
   - Outputs: `.ox.test` files with commands + `manifest.json`

2. **Phase 2: Execution (deterministic, run many times)**
   - Oxtest → Parser → Command objects → Playwright
   - Fast, reliable, no AI latency

This separation ensures maintainability, testability, and debuggability while leveraging AI's strength in understanding intent and discovering correct interaction sequences.

## Development Status

This project is currently in **Phase 1: MVP Development**.

Target: Basic end-to-end flow with YAML parsing, LLM decomposition, Playwright execution, and HTML reporting.

See [00-4: Technical Decisions and Roadmap](./00-4-technical-decisions-and-roadmap.md) for detailed implementation phases.

## License

TBD
