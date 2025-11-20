# E2E Test Agent - Scripts

Convenient shell scripts for running the E2E Test Agent.

## Scripts Overview

- **run.sh** - Generate and execute tests from YAML specifications
- **run_tests.sh** - Run existing Playwright tests with interactive UI

## run.sh

Main script for generating and executing tests.

**Key Features:**
- Uses `.env` from your **current working directory**
- Simple positional argument for YAML file path
- All paths are relative to where you run the script

### Quick Start

```bash
# Generate and execute tests from YAML file (default: everything enabled)
./bin/run.sh tests/realworld/paypal.yaml

# Generate tests only (no execution)
./bin/run.sh tests/login.yaml --no-execute

# Only generate OXTest (skip Playwright generation)
./bin/run.sh tests/login.yaml --no-playwright

# Only generate Playwright (skip OXTest generation)
./bin/run.sh tests/login.yaml --no-oxtest

# Execute existing tests only (no generation)
./bin/run.sh tests/realworld/paypal.yaml --no-oxtest --no-playwright

# Show help
./bin/run.sh --help
```

### Common Use Cases

#### 1. Simple - Just provide the YAML path

```bash
./bin/run.sh tests/realworld/paypal.yaml
```

This will:
- Use `.env` from current directory
- Read the YAML file
- Generate `.ox.test` files (OXTest format)
- Generate `.spec.ts` files (Playwright format)
- Execute the .ox.test files
- Generate **all report formats**: HTML, JSON, JUnit, and Console

#### 2. Generate tests only

```bash
./bin/run.sh tests/login.yaml --no-execute
```

Generates test files (both OXTest and Playwright) without executing them.

#### 3. Only generate OXTest format

```bash
./bin/run.sh tests/login.yaml --no-playwright --no-execute
```

Generates only `.ox.test` files without Playwright `.spec.ts` files or execution.

#### 4. Only generate Playwright format

```bash
./bin/run.sh tests/login.yaml --no-oxtest --no-execute
```

Generates only `.spec.ts` files without OXTest `.ox.test` files or execution.

#### 5. Execute existing tests

```bash
./bin/run.sh tests/login.yaml --no-oxtest --no-playwright
```

Executes existing `.ox.test` files in `_generated/` directory without generating new tests.

#### 6. Custom output directory

```bash
./bin/run.sh tests/checkout.yaml --output=_checkout
```

#### 7. Execute specific test pattern

```bash
./bin/run.sh tests/checkout.yaml --no-oxtest --no-playwright --tests="paypal*.ox.test"
```

#### 8. Custom reporters

```bash
./bin/run.sh tests/test.yaml --reporter=json,junit
```

### All Options

| Option | Description | Default |
|--------|-------------|---------|
| `<yaml-path>` | Path to YAML file (positional) | Required for generation |
| `--no-oxtest` | Skip OXTest generation | OXTest generation enabled |
| `--no-playwright` | Skip Playwright generation | Playwright generation enabled |
| `--no-execute` | Skip test execution | Test execution enabled |
| `--output <path>` | Output directory | `_generated` |
| `--tests <pattern>` | Test file pattern to execute | All `.ox.test` files |
| `--reporter <formats>` | Report formats (comma-separated) | `html,json,junit,console` (all) |
| `--no-verbose` | Disable verbose logging | Verbose enabled |
| `--help` | Show help message | - |

### Environment Setup

The script looks for `.env` in your **current working directory** (not the script's location).

Create `.env` in your working directory:

```env
# Required
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4o                    # or deepseek-reasoner

# Optional
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7
```

See the project's `.env.example` for all available configuration options.

### Exit Codes

- `0` - Success
- `1` - Error (invalid arguments, missing files, etc.)
- `>1` - Test execution failures

### Examples

```bash
# Example 1: Simple test generation and execution (everything enabled by default)
./bin/run.sh tests/realworld/paypal.yaml

# Example 2: Generate tests for multiple YAML files (no execution)
./bin/run.sh tests/login.yaml --output=_login --no-execute
./bin/run.sh tests/checkout.yaml --output=_checkout --no-execute

# Example 3: Execute existing tests only (no generation)
./bin/run.sh tests/paypal.yaml --no-oxtest --no-playwright

# Example 4: Generate and execute with JSON reports only
./bin/run.sh tests/my-test.yaml --reporter=json

# Example 5: Execute only PayPal tests
./bin/run.sh tests/paypal.yaml --no-oxtest --no-playwright --tests="paypal*.ox.test"

# Example 6: Only generate OXTest files (no Playwright, no execution)
./bin/run.sh tests/test.yaml --no-playwright --no-execute

# Example 7: Only generate Playwright files (no OXTest, no execution)
./bin/run.sh tests/test.yaml --no-oxtest --no-execute

# Example 8: Run from any directory (not just project root)
cd /path/to/my/test/project
/path/to/e2e-agent/bin/run.sh my-tests.yaml
# This will use .env from /path/to/my/test/project
```

### Troubleshooting

**Error: Environment file not found**
```bash
cp .env.example .env
# Edit .env with your API keys
```

**Error: dist directory not found**
```bash
npm run build
```

**Invalid model error**
- Check your `.env` file
- Ensure `OPENAI_MODEL` is set to a valid model
- See `.env.example` for valid model names

### Development

The script is located at `bin/run.sh` and can be modified to add new features or change defaults.

To make it globally accessible, add to your PATH or create an alias:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias e2e-run='/path/to/e2e-agent/bin/run.sh'
alias e2e-test='/path/to/e2e-agent/bin/run_tests.sh'
```

---

## run_tests.sh

Playwright test runner with interactive UI by default.

**Key Features:**
- Runs Playwright tests with interactive UI (default)
- Simple command to test generated files
- Headless mode available with `--no-ui` flag
- Supports test patterns and specific files

### Quick Start

```bash
# Run all tests in _generated with interactive UI (default)
./bin/run_tests.sh

# Run tests without UI (headless mode)
./bin/run_tests.sh --no-ui

# Run specific test file with UI
./bin/run_tests.sh --tests _generated/paypal-payment-test.spec.ts

# Show help
./bin/run_tests.sh --help
```

### Common Use Cases

#### 1. Run all generated tests with UI

```bash
./bin/run_tests.sh
```

Opens Playwright's interactive UI where you can:
- See all available tests
- Run tests individually or all at once
- View test execution in real-time
- Debug test failures
- View screenshots and traces

#### 2. Run tests in headless mode (CI/CD)

```bash
./bin/run_tests.sh --no-ui
```

Runs all tests without UI - perfect for automated CI/CD pipelines.

#### 3. Run specific test file with UI

```bash
./bin/run_tests.sh --tests _generated/paypal-payment-test.spec.ts
```

#### 4. Run test pattern without UI

```bash
./bin/run_tests.sh --tests "_generated/paypal*.spec.ts" --no-ui
```

#### 5. Run tests from custom output directory

```bash
./bin/run_tests.sh --tests _custom_output
```

### All Options

| Option | Description | Default |
|--------|-------------|---------|
| `--tests <dir>` | Test directory or pattern | `_generated` |
| `--no-ui` | Run in headless mode | UI mode enabled |
| `--help` | Show help message | - |

### Workflow Example

Complete workflow from generation to testing:

```bash
# Step 1: Generate tests from YAML (without execution)
./bin/run.sh tests/realworld/paypal.yaml --no-execute

# Step 2: Run the generated tests with interactive UI
./bin/run_tests.sh

# Step 3: For CI/CD, run without UI
./bin/run_tests.sh --no-ui
```

### Notes

- The script uses `npx playwright test` under the hood
- UI mode uses Playwright's `--ui` flag for interactive testing
- Headless mode runs tests in the background
- Test files must be `.spec.ts` Playwright format
- Make sure Playwright is installed: `npm install`

### Troubleshooting

**Error: Test path not found**
```bash
# Make sure you generated tests first
./bin/run.sh tests/realworld/paypal.yaml --no-execute
```

**Playwright not installed**
```bash
npm install
npx playwright install
```

