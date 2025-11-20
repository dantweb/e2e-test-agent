# E2E Test Agent - Scripts

Convenient shell scripts for running the E2E Test Agent.

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
```
