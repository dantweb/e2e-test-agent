# Real-World Integration Tests

This directory contains **true end-to-end integration tests** that run the full e2e-test-agent pipeline from YAML specification to test execution.

## What These Tests Do

Unlike unit tests (mocked) or component integration tests (testing individual parts), these tests run the **complete e2e-test-agent workflow**:

1. ✅ **Parse YAML** - Load test specification from YAML file
2. ✅ **LLM Decomposition** - Use real OpenAI API to decompose high-level tasks
3. ✅ **Generate Tests** - Create `.ox.test` files with Playwright code
4. ✅ **Execute Tests** - Run generated tests against real website (https://osc2.oxid.shop)
5. ✅ **Validate Results** - Verify test artifacts and execution results

## Test Files

```
tests/realworld/
├── shopping-flow.yaml              # Test specification (from README-DEV-EXAMPLES.md)
├── .env.test                       # Environment configuration
├── e2e-agent-integration.test.ts   # The actual integration test
├── _generated/                     # Generated test files (created during test run)
│   ├── *.ox.test                  # Generated Playwright tests
│   └── *.log                      # Execution logs
└── README.md                       # This file
```

## Prerequisites

### Required Environment Variables

```bash
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_API_URL=https://api.openai.com/v1  # Optional
```

### Required Dependencies

```bash
npm ci                              # Install all dependencies
npm run build                       # Build the project
npx playwright install chromium     # Install Playwright browsers
```

## Running the Tests

### Run Real-World Integration Tests

```bash
npm run test:realworld
```

### Run with Debug Output

```bash
DEBUG=* npm run test:realworld
```

### Run Specific Test

```bash
npm run test:realworld -- --testNamePattern="should run e2e-test-agent"
```

### Manual CLI Execution (Without Jest Wrapper)

#### 1. Generate Playwright tests from YAML

```bash
# Navigate to the realworld tests directory
cd tests/realworld

# Run e2e-test-agent CLI to generate tests
node ../../dist/index.js \
  --src=shopping-flow.yaml \
  --output=_generated \
  --env=.env.test \
  --verbose

# Output: Creates _generated/shopping-cart-test.spec.ts
```

#### 2. Run the generated Playwright tests

```bash
# Execute the generated test with Playwright
cd _generated
npx playwright test shopping-cart-test.spec.ts --timeout=90000

# Run with visible browser (headed mode)
npx playwright test shopping-cart-test.spec.ts --timeout=90000 --headed

# Run with specific browser
npx playwright test shopping-cart-test.spec.ts --timeout=90000 --project=chromium
```

#### 3. Full Manual Workflow

```bash
# From project root
cd /home/dtkachev/osc/strpwt7-oct21/e2e-agent

# 1. Build the project
npm run build

# 2. Generate tests
cd tests/realworld
node ../../dist/index.js --src=shopping-flow.yaml --output=_generated --env=.env.test --verbose

# 3. Review generated test
cat _generated/shopping-cart-test.spec.ts

# 4. Execute generated test
cd _generated
npx playwright test --timeout=90000

# 5. View test report (if tests run)
npx playwright show-report
```

## Test Scenarios

### Shopping Cart Flow

The test implements the shopping cart example from `README-DEV-EXAMPLES.md`:

**YAML Specification** (`shopping-flow.yaml`):
- Go to homepage
- Add 2 different products to cart
- Navigate to category and add 1 product
- View shopping cart with all 3 products

**Test Flow**:
1. Reads YAML specification
2. Calls OpenAI API to decompose tasks into Playwright steps
3. Generates executable `.ox.test` files
4. Runs the generated tests against https://osc2.oxid.shop
5. Validates test results

## Expected Output

### Successful Run

```bash
$ npm run test:realworld

PASS tests/realworld/e2e-agent-integration.test.ts
  E2E Test Agent - Real World Integration
    Full E2E Pipeline
      ✓ should verify test files exist (5ms)
      🚀 Running e2e-test-agent to generate tests...
      ✓ should run e2e-test-agent to generate .ox.test files (45231ms)
      ✅ Generated 4 test files
      ✓ should verify generated .ox.test files have valid structure (123ms)
      🎭 Running generated Playwright tests...
      ✓ should execute generated tests against real website (89456ms)
      🎉 All generated tests executed successfully!
    Test Artifacts
      ✓ should have generated test artifacts (12ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        134.892 s
```

### If API Key Missing

```bash
⚠️  OPENAI_API_KEY not set - skipping real-world integration tests
Skipping test - no API key
```

## Cost Considerations

### OpenAI API Costs

These tests make **real API calls** to OpenAI:
- Each test run: ~$0.05 - $0.15
- Includes task decomposition, selector generation, code generation
- Uses GPT-4 (configurable to GPT-3.5 for lower cost)

**Monthly estimate** (if run frequently):
- Daily runs: ~$1.50 - $4.50/month
- Weekly runs: ~$0.20 - $0.60/month
- Per-PR runs: Depends on PR frequency

### Tips to Minimize Costs

```bash
# Use smaller/cheaper model
export OPENAI_MODEL=gpt-3.5-turbo

# Run less frequently (weekly instead of daily)
# Configure in CI to run only on main branch or tags

# Run locally before committing instead of in CI
npm run test:realworld
```

## Comparison: Unit vs Integration vs Real-World

| Aspect | Unit Tests | Integration Tests | Real-World Tests |
|--------|-----------|-------------------|------------------|
| **Scope** | Single component | Component interaction | Full pipeline |
| **API Calls** | ❌ Mocked | ✅ Real (component-level) | ✅ Real (full flow) |
| **Test Generation** | ❌ No | ❌ No | ✅ Yes |
| **Test Execution** | ❌ No | ✅ Yes (browser) | ✅ Yes (generated tests) |
| **Cost** | Free | ~$0.01/run | ~$0.10/run |
| **Speed** | Fast (~20s) | Medium (~2-5 min) | Slow (~2-3 min) |
| **CI Frequency** | Every push | Weekly/Manual | Manual/Release |
| **Confidence** | Low | Medium | High |

## CI/CD Integration

### GitHub Actions Workflow

Add to `.github/workflows/realworld-tests.yml`:

```yaml
name: Real-World Integration Tests

on:
  workflow_dispatch:  # Manual trigger only
  release:
    types: [published]

jobs:
  realworld-tests:
    name: Full E2E Pipeline Test
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install chromium

      - name: Run real-world integration tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          OPENAI_API_URL: ${{ secrets.OPENAI_API_URL }}
        run: npm run test:realworld

      - name: Upload generated tests
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: generated-tests
          path: tests/realworld/_generated/
          retention-days: 30
```

### Recommended CI Strategy

1. **Unit Tests**: Every push (fast, free)
2. **Integration Tests**: Weekly or manual (medium cost)
3. **Real-World Tests**: Manual or on releases (higher cost, full confidence)

## Troubleshooting

### Test Generation Fails

**Problem**: E2E agent fails to generate tests

**Check**:
```bash
# Verify project is built
npm run build
ls -la dist/

# Verify API key is set
echo $OPENAI_API_KEY

# Run with debug logging
DEBUG=* npm run test:realworld
```

### Generated Tests Don't Execute

**Problem**: Playwright can't run generated tests

**Check**:
```bash
# Verify Playwright is installed
npx playwright --version

# Install browsers
npx playwright install chromium

# Check generated test syntax
cat tests/realworld/_generated/*.ox.test
```

### API Rate Limiting

**Problem**: `429 Too Many Requests` from OpenAI

**Solution**:
- Wait a few minutes between test runs
- Use lower-tier model (gpt-3.5-turbo)
- Check OpenAI account rate limits

### Website Unreachable

**Problem**: Test fails to reach https://osc2.oxid.shop

**Solution**:
```bash
# Test website accessibility
curl -I https://osc2.oxid.shop

# Check network/firewall
ping osc2.oxid.shop

# Try different test URL
export BASE_URL=https://alternative-site.com
```

## Files Generated During Test Run

The `_generated/` directory will contain:

```
_generated/
├── shopping-cart-test.spec.ts    # Generated Playwright test (all jobs as sequential steps)
├── execution.log                 # Test execution logs (if generated)
└── screenshots/                  # Screenshots if tests fail
    └── *.png
```

**Important Notes:**
- ✅ **ONE test file per YAML** - All jobs become sequential steps in a single test
- ✅ **Sequential execution** - All jobs run in the same browser session without page reloads
- ✅ **Automatically generated** by e2e-test-agent using LLM
- ✅ **Executable Playwright tests** using modern locator API
- ✅ **Can be manually reviewed and modified** after generation
- ✅ **Committable to repo** if desired (for version control and debugging)
- ⚠️  **Gitignored by default** (regenerated on each run)

**Output Format Options:**
- `.spec.ts` - Standard Playwright test files (default, production-ready)
- `.ox.test` - Intermediate format using OXTest commands (debugging, see CommandType.ts)

## Best Practices

### 1. Run Before Releases

```bash
# Before tagging a release
npm run build
npm run test:unit          # Fast validation
npm run test:realworld     # Full confidence check
git tag v1.2.3
git push --tags
```

### 2. Local Testing

```bash
# Test locally before pushing
export OPENAI_API_KEY=sk-your-key
npm run build
npm run test:realworld

# Review generated tests
cat tests/realworld/_generated/*.ox.test
```

### 3. Review Generated Tests

After running, inspect generated tests:
```bash
# Check test quality
ls -la tests/realworld/_generated/
cat tests/realworld/_generated/*.ox.test

# Run tests manually with visible browser
HEADLESS=false npx playwright test tests/realworld/_generated/
```

### 4. Version Control

```bash
# Option 1: Gitignore _generated (regenerate each time)
echo "tests/realworld/_generated/" >> .gitignore

# Option 2: Commit _generated (keep for reference)
git add tests/realworld/_generated/
git commit -m "Add generated test reference"
```

## Related Documentation

- [README-DEV-EXAMPLES.md](../../README-DEV-EXAMPLES.md) - Developer examples this test implements
- [Integration Tests](../integration/README.md) - Component-level integration tests
- [Docker Documentation](../../docs/DOCKER.md) - Running in containers
- [Main README](../../README.md) - Getting started guide

## Support

For issues specific to real-world tests:
1. Check this README troubleshooting section
2. Verify prerequisites (API key, build, Playwright)
3. Review logs in `_generated/*.log`
4. Open GitHub issue with test output

## Summary

These real-world integration tests provide:
- ✅ **End-to-end validation** of the full e2e-test-agent pipeline
- ✅ **Real LLM integration** with actual API calls
- ✅ **Actual test generation** producing .ox.test files
- ✅ **Test execution** against real websites
- ✅ **High confidence** that the system works as expected

Use them **strategically** (manual/release) rather than on every commit due to cost and time.
