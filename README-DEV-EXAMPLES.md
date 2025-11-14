# E2E Test Agent - Developer Examples

This document provides practical examples for using E2E Test Agent in real-world scenarios, including GitHub Actions integration and common test patterns.

## Table of Contents

- [Quick Start Examples](#quick-start-examples)
- [GitHub Actions Integration](#github-actions-integration)
- [Test Examples](#test-examples)
- [Docker Usage Patterns](#docker-usage-patterns)
- [Advanced Scenarios](#advanced-scenarios)

## Quick Start Examples

### Basic Local Usage

```bash
# 1. Create a test specification
cat > shopping-test.yaml <<EOF
test-shopping-flow:
  environment: production
  url: https://osc2.oxid.shop
  timeout: 30
  jobs:
    - name: browse-homepage
      prompt: Go to the first page and verify it loads
      acceptance:
        - page loads successfully
        - no error messages are visible

    - name: add-two-products
      prompt: Add 2 different products to the cart
      acceptance:
        - you see confirmation messages
        - mini-cart shows 2 items

    - name: browse-category
      prompt: Navigate to a product category and add one product to cart
      acceptance:
        - category page displays products
        - mini-cart now shows 3 items total

    - name: view-cart
      prompt: Go to the shopping cart page
      acceptance:
        - cart page displays all 3 products
        - prices are shown correctly
        - checkout button is visible
EOF

# 2. Create environment configuration
cat > .env <<EOF
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
BASE_URL=https://osc2.oxid.shop
HEADLESS=true
BROWSER=chromium
EOF

# 3. Run with Docker
docker run --rm \
  -v $(pwd):/workspace \
  dantweb/e2e-test-agent:latest \
  --env=.env \
  --src=shopping-test.yaml \
  --output=_generated
```

### Using Docker Compose

```bash
# Set environment variables
export E2E_OPENAI_API_KEY=sk-your-key-here
export E2E_LLM_PROVIDER=openai
export E2E_BASE_URL=https://osc2.oxid.shop

# Run tests
docker compose run --rm e2e-agent \
  --env=.env \
  --src=shopping-test.yaml \
  --output=_generated
```

## GitHub Actions Integration

### Complete E2E Testing Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run nightly at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      test_url:
        description: 'URL to test'
        required: false
        default: 'https://osc2.oxid.shop'

jobs:
  generate-and-run-tests:
    name: Generate and Run E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Create test specification
        run: |
          mkdir -p e2e-tests
          cat > e2e-tests/shopping-flow.yaml <<'EOF'
          shopping-cart-test:
            environment: production
            url: ${{ github.event.inputs.test_url || 'https://osc2.oxid.shop' }}
            timeout: 30
            jobs:
              - name: homepage
                prompt: Go to the first page
                acceptance:
                  - page loads without errors
                  - shop logo is visible

              - name: add-two-products
                prompt: Add 2 different products to the cart from the homepage
                acceptance:
                  - products are added successfully
                  - mini-cart badge shows 2 items

              - name: browse-category-and-add
                prompt: Navigate to a product category and add one product to cart
                acceptance:
                  - category page loads
                  - product is added to cart
                  - mini-cart badge shows 3 items

              - name: view-cart
                prompt: Go to the shopping cart page
                acceptance:
                  - cart displays all 3 products
                  - product names and prices are visible
                  - checkout button is present
          EOF

      - name: Create environment configuration
        run: |
          cat > e2e-tests/.env <<EOF
          LLM_PROVIDER=openai
          OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          OPENAI_API_URL=https://api.openai.com/v1
          OPENAI_MODEL=gpt-4o
          OPENAI_MAX_TOKENS=4000
          BASE_URL=${{ github.event.inputs.test_url || 'https://osc2.oxid.shop' }}
          HEADLESS=true
          BROWSER=chromium
          TIMEOUT=30000
          SCREENSHOT_ON_FAILURE=true
          LOG_LEVEL=info
          EOF

      - name: Pull E2E Agent Docker image
        run: docker pull dantweb/e2e-test-agent:latest

      - name: Run E2E tests with agent
        run: |
          docker run --rm \
            -v $(pwd)/e2e-tests:/workspace \
            dantweb/e2e-test-agent:latest \
            --env=.env \
            --src=shopping-flow.yaml \
            --output=_generated

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-test-results-${{ github.run_number }}
          path: |
            e2e-tests/_generated/
            e2e-tests/*.log
          retention-days: 30

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-failure-screenshots-${{ github.run_number }}
          path: e2e-tests/_generated/**/*.png
          retention-days: 7

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const resultsPath = 'e2e-tests/_generated/results.json';

            if (fs.existsSync(resultsPath)) {
              const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

              const comment = `## 🧪 E2E Test Results

              **Status**: ${results.passed ? '✅ Passed' : '❌ Failed'}
              **Total Tests**: ${results.total}
              **Passed**: ${results.passed}
              **Failed**: ${results.failed}
              **Duration**: ${results.duration}

              [View full results](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
              `;

              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            }

      - name: Fail workflow if tests failed
        if: failure()
        run: exit 1
```

### Simplified Workflow (Test Only)

For projects that already have test specifications:

```yaml
name: Run E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run E2E Tests
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            -e OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} \
            -e LLM_PROVIDER=openai \
            -e BASE_URL=https://osc2.oxid.shop \
            -e HEADLESS=true \
            dantweb/e2e-test-agent:latest \
            --env=/workspace/.env \
            --src=/workspace/tests/shopping-flow.yaml \
            --output=/workspace/_generated

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: _generated/
```

### Multi-Environment Testing

Test against multiple environments in parallel:

```yaml
name: Multi-Environment E2E Tests

on:
  workflow_dispatch:

jobs:
  e2e-matrix:
    strategy:
      matrix:
        environment:
          - name: staging
            url: https://staging.oxid.shop
          - name: production
            url: https://osc2.oxid.shop
          - name: demo
            url: https://demo.oxid.shop
      fail-fast: false

    runs-on: ubuntu-latest
    name: Test ${{ matrix.environment.name }}

    steps:
      - uses: actions/checkout@v4

      - name: Run tests on ${{ matrix.environment.name }}
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            -e OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} \
            -e BASE_URL=${{ matrix.environment.url }} \
            -e HEADLESS=true \
            dantweb/e2e-test-agent:latest \
            --src=tests/shopping-flow.yaml \
            --output=_generated/${{ matrix.environment.name }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results-${{ matrix.environment.name }}
          path: _generated/${{ matrix.environment.name }}/
```

## Test Examples

### Example 1: Shopping Cart Flow

**File**: `tests/shopping-cart.yaml`

```yaml
shopping-cart-test:
  environment: production
  url: https://osc2.oxid.shop
  timeout: 30
  jobs:
    - name: homepage
      prompt: Go to the first page of the shop
      acceptance:
        - the homepage loads successfully
        - the shop logo is visible
        - no error messages are displayed

    - name: add-first-product
      prompt: Find and add the first visible product to the cart
      acceptance:
        - product is added successfully
        - mini-cart badge shows 1 item
        - you see an "added to cart" confirmation

    - name: add-second-product
      prompt: Find a different product and add it to the cart
      acceptance:
        - second product is added successfully
        - mini-cart badge now shows 2 items

    - name: browse-category
      prompt: Click on a product category from the navigation menu
      acceptance:
        - category page loads
        - multiple products are displayed
        - category name is shown in the heading

    - name: add-from-category
      prompt: Add one product from this category to the cart
      acceptance:
        - product is added to cart
        - mini-cart badge shows 3 items total

    - name: open-cart
      prompt: Go to the shopping cart page
      acceptance:
        - cart page opens
        - all 3 products are listed
        - product names are visible
        - prices are displayed
        - subtotal is calculated
        - checkout button is present

    - name: verify-cart-totals
      prompt: Verify the cart shows the correct number of items and total
      acceptance:
        - cart shows 3 items
        - each product has quantity 1
        - total price is the sum of all products
```

**Run it:**

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -e OPENAI_API_KEY=sk-your-key \
  -e BASE_URL=https://osc2.oxid.shop \
  dantweb/e2e-test-agent:latest \
  --src=tests/shopping-cart.yaml \
  --output=_generated
```

### Example 2: User Authentication

**File**: `tests/auth-flow.yaml`

```yaml
user-authentication:
  environment: test
  url: https://osc2.oxid.shop
  timeout: 20
  jobs:
    - name: navigate-to-login
      prompt: Find and click the login or account link
      acceptance:
        - login page or modal is displayed
        - email/username field is visible
        - password field is visible

    - name: login
      prompt: Login with email=${TEST_EMAIL} and password=${TEST_PASSWORD}
      acceptance:
        - login is successful
        - user is redirected to account page or homepage
        - logged-in state is visible (e.g., "My Account" link)

    - name: verify-account-access
      prompt: Navigate to the account dashboard
      acceptance:
        - account page loads
        - user's email or name is displayed
        - account options are visible

    - name: logout
      prompt: Log out from the account
      acceptance:
        - logout is successful
        - you are redirected to homepage or login page
        - logged-out state is visible
```

### Example 3: Product Search

**File**: `tests/product-search.yaml`

```yaml
product-search:
  environment: production
  url: https://osc2.oxid.shop
  timeout: 15
  jobs:
    - name: find-search-box
      prompt: Locate the search input field on the page
      acceptance:
        - search box is visible
        - search box is clickable

    - name: search-product
      prompt: Search for "shirt" in the search box
      acceptance:
        - search is executed
        - search results page loads
        - multiple products are displayed

    - name: verify-results
      prompt: Verify search results contain relevant products
      acceptance:
        - at least one product is shown
        - product titles contain "shirt" or related terms
        - products have images and prices

    - name: select-product
      prompt: Click on the first product from search results
      acceptance:
        - product detail page opens
        - product name is displayed
        - price is visible
        - add to cart button is present
```

### Example 4: Checkout Flow (Advanced)

**File**: `tests/checkout-flow.yaml`

```yaml
complete-checkout:
  environment: staging
  url: https://staging.oxid.shop
  timeout: 45
  jobs:
    - name: add-products
      prompt: Add 2 products to the cart
      acceptance:
        - cart has 2 items

    - name: go-to-checkout
      prompt: Navigate to checkout
      acceptance:
        - checkout page loads
        - cart summary is visible

    - name: enter-shipping-address
      prompt: |
        Fill in shipping address with:
        - First name: Test
        - Last name: User
        - Street: 123 Test Street
        - City: Berlin
        - Postal code: 10115
        - Country: Germany
      acceptance:
        - form is filled correctly
        - validation passes
        - continue to next step is available

    - name: select-shipping-method
      prompt: Choose the first available shipping method
      acceptance:
        - shipping method is selected
        - shipping cost is displayed

    - name: select-payment-method
      prompt: Select invoice as payment method
      acceptance:
        - payment method is selected
        - payment information is displayed

    - name: review-order
      prompt: Review the order summary
      acceptance:
        - all products are listed
        - shipping address is correct
        - payment method is shown
        - total price includes shipping

    - name: place-order
      prompt: Place the order
      acceptance:
        - order is placed successfully
        - order confirmation page is shown
        - order number is displayed
      on_error:
        catch: log error and continue
```

## Docker Usage Patterns

### Using Custom OpenAI-Compatible APIs

```bash
# Using Azure OpenAI
docker run --rm \
  -v $(pwd):/workspace \
  -e LLM_PROVIDER=openai \
  -e OPENAI_API_KEY=your-azure-key \
  -e OPENAI_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment \
  -e OPENAI_MODEL=gpt-4 \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated
```

### Using Anthropic Claude

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -e LLM_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=sk-ant-your-key \
  -e ANTHROPIC_API_URL=https://api.anthropic.com/v1 \
  -e ANTHROPIC_MODEL=claude-3-5-sonnet-20241022 \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated
```

### Development Mode (Non-Headless)

For debugging, run with visible browser:

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -e OPENAI_API_KEY=sk-your-key \
  -e HEADLESS=false \
  -e LOG_LEVEL=debug \
  --env DISPLAY=:0 \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated
```

### Running Tests with Network Access to Host

When testing applications running on the host:

```bash
# Linux/Mac
docker run --rm \
  --network host \
  -v $(pwd):/workspace \
  -e OPENAI_API_KEY=sk-your-key \
  -e BASE_URL=http://localhost:8000 \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated

# Windows/Mac with Docker Desktop
docker run --rm \
  -v $(pwd):/workspace \
  -e OPENAI_API_KEY=sk-your-key \
  -e BASE_URL=http://host.docker.internal:8000 \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated
```

## Advanced Scenarios

### Generating Playwright Tests from Natural Language

**Workflow**: Natural Language → E2E Agent → Playwright Tests → Execute

```bash
# Step 1: Create high-level test description
cat > test-spec.yaml <<EOF
generate-playwright-tests:
  environment: production
  url: https://osc2.oxid.shop
  timeout: 30
  jobs:
    - name: shopping-flow
      prompt: |
        Go to homepage, add 2 products, navigate to a category,
        add 1 product from category, then view cart
      acceptance:
        - cart shows 3 products
        - checkout button is visible
EOF

# Step 2: Run E2E agent to generate .ox.test files
docker run --rm \
  -v $(pwd):/workspace \
  -e OPENAI_API_KEY=sk-your-key \
  dantweb/e2e-test-agent:latest \
  --src=test-spec.yaml \
  --output=_generated \
  --format=oxtest

# Step 3: Generated files in _generated/*.ox.test
# These can be executed with Playwright or oxtest executor
```

### CI/CD Pipeline with Test Generation

Complete pipeline that generates and runs tests:

```yaml
name: Generate and Execute E2E Tests

on: [push, pull_request]

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Generate Playwright tests from natural language
      - name: Generate tests with E2E Agent
        run: |
          docker run --rm \
            -v $(pwd):/workspace \
            -e OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} \
            dantweb/e2e-test-agent:latest \
            --src=test-specs/shopping.yaml \
            --output=generated-tests \
            --format=oxtest

      # Run generated tests
      - name: Execute generated tests
        run: |
          docker run --rm \
            -v $(pwd)/generated-tests:/tests \
            mcr.microsoft.com/playwright:latest \
            npx playwright test /tests

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            generated-tests/
            playwright-report/
```

### Environment-Specific Configuration

**Directory structure:**
```
tests/
  ├── base-test.yaml
  ├── .env.dev
  ├── .env.staging
  └── .env.production
```

**Run with specific environment:**

```bash
# Development
docker run --rm \
  -v $(pwd)/tests:/workspace \
  dantweb/e2e-test-agent:latest \
  --env=.env.dev \
  --src=base-test.yaml \
  --output=_generated/dev

# Staging
docker run --rm \
  -v $(pwd)/tests:/workspace \
  dantweb/e2e-test-agent:latest \
  --env=.env.staging \
  --src=base-test.yaml \
  --output=_generated/staging

# Production
docker run --rm \
  -v $(pwd)/tests:/workspace \
  dantweb/e2e-test-agent:latest \
  --env=.env.production \
  --src=base-test.yaml \
  --output=_generated/production
```

## Best Practices

### 1. Test Organization

```
project/
├── e2e-tests/
│   ├── critical/              # Critical user flows
│   │   ├── checkout.yaml
│   │   └── authentication.yaml
│   ├── smoke/                 # Quick smoke tests
│   │   └── homepage.yaml
│   ├── regression/            # Full regression suite
│   │   ├── product-search.yaml
│   │   └── cart-operations.yaml
│   ├── .env.example
│   └── README.md
└── .github/
    └── workflows/
        ├── e2e-critical.yml   # Run on every push
        ├── e2e-smoke.yml      # Run on PR
        └── e2e-full.yml       # Nightly full suite
```

### 2. Secret Management

```yaml
# .github/workflows/e2e.yml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

### 3. Retry Logic

```bash
# Retry failed tests up to 3 times
for i in {1..3}; do
  docker run --rm \
    -v $(pwd):/workspace \
    -e OPENAI_API_KEY=$OPENAI_API_KEY \
    dantweb/e2e-test-agent:latest \
    --src=test.yaml \
    --output=_generated && break || sleep 10
done
```

### 4. Parallel Execution

```bash
# Run multiple test files in parallel
docker run --rm \
  -v $(pwd):/workspace \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e TEST_PARALLELISM=4 \
  dantweb/e2e-test-agent:latest \
  --src=tests/*.yaml \
  --output=_generated \
  --parallel
```

## Troubleshooting

### Test Failures

```bash
# Enable debug logging
docker run --rm \
  -v $(pwd):/workspace \
  -e LOG_LEVEL=debug \
  -e SCREENSHOT_ON_FAILURE=true \
  dantweb/e2e-test-agent:latest \
  --src=test.yaml \
  --output=_generated

# Check logs
cat _generated/*.log

# View screenshots
ls -la _generated/**/*.png
```

### Performance Issues

```bash
# Reduce timeout for faster failures
-e TIMEOUT=10000

# Use faster LLM model
-e OPENAI_MODEL=gpt-3.5-turbo

# Reduce parallelism
-e TEST_PARALLELISM=1
```

## Additional Resources

- [Main README](./README.md) - Getting started guide
- [Docker Documentation](./docs/DOCKER.md) - Comprehensive Docker usage
- [Architecture](./docs/e2e-tester-agent/README.md) - System architecture
- [API Reference](./docs/API.md) - API documentation (if available)

## Support

For issues and questions:
- GitHub Issues: [Create an issue](../../issues)
- Documentation: [docs/](./docs/)
- Examples: This file
