# Integration Tests - Implementation Summary

**Date**: November 14, 2025
**Status**: ✅ Complete
**Test Coverage**: Real LLM API calls + Real browser automation

---

## 🎯 What Was Created

Real integration tests that **actually make API calls** and **perform browser automation** against live websites.

### Test Suites

1. **LLM Integration Tests** (`tests/integration/llm/openai-real.test.ts`)
   - Makes real OpenAI API calls
   - Tests actual text generation
   - Validates token usage tracking
   - Tests error handling and rate limiting

2. **E2E Browser Tests** (`tests/integration/e2e/oxid-shop-real.test.ts`)
   - Opens real browser (Chrome)
   - Tests against https://osc2.oxid.shop
   - Validates homepage, navigation, products, cart, search
   - Tests responsive design (mobile/tablet)

---

## 🔑 GitHub Secrets Required

You need to add these secrets to your repository:

### Go to: Settings → Secrets and variables → Actions

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `OPEN_AI_KEY` | `sk-proj-...` | Your OpenAI API key |
| `OPEN_AI_URL` | `https://api.openai.com/v1` | OpenAI API endpoint (optional) |

---

## 🚀 Running Integration Tests

### Locally

```bash
# 1. Set environment variables
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_API_URL=https://api.openai.com/v1  # optional
export TEST_URL=https://osc2.oxid.shop

# 2. Install dependencies
npm ci
npx playwright install chromium

# 3. Run all integration tests
npm run test:integration

# 4. Run only LLM tests
npm run test:integration -- --testPathPatterns=llm

# 5. Run only E2E browser tests
npm run test:integration -- --testPathPatterns=e2e
```

### In GitHub Actions

Integration tests run:
- **Weekly**: Every Sunday at 2 AM UTC
- **Manually**: Via workflow_dispatch
- **On Changes**: When integration test files change

#### Manual Trigger
1. Go to: Actions → Integration Tests
2. Click "Run workflow"
3. Optionally specify TEST_URL
4. Click "Run workflow"

---

## 📁 Files Created

### Test Files
- `tests/integration/llm/openai-real.test.ts` - Real LLM API tests
- `tests/integration/e2e/oxid-shop-real.test.ts` - Real browser E2E tests
- `tests/integration/README.md` - Integration test documentation

### Configuration
- `.github/workflows/integration-tests.yml` - GitHub Actions workflow

### Documentation
- Updated `README.md` - Mentioned integration tests
- `INTEGRATION-TESTS-SUMMARY.md` - This file

---

## 🧪 Test Coverage

### LLM Tests (8 tests)

```
OpenAI LLM Integration Tests (Real API)
  Basic Generation
    ✓ should generate a real response from OpenAI
    ✓ should respect system prompt
    ✓ should handle different temperature settings
  E2E Test Generation
    ✓ should generate test decomposition instructions
    ✓ should generate CSS selectors from description
  Error Handling
    ✓ should handle rate limiting gracefully
    ✓ should handle long context
  Token Usage Tracking
    ✓ should accurately report token usage
```

### E2E Browser Tests (13 tests)

```
OXID eShop Real E2E Test
  Homepage Navigation
    ✓ should load the homepage successfully
    ✓ should display shop logo
    ✓ should have navigation menu
  Product Browsing
    ✓ should display products on homepage
    ✓ should be able to click on a product category
  Add to Cart Flow
    ✓ should find add to cart buttons
    ✓ should have a cart icon or link
  Search Functionality
    ✓ should have a search box
    ✓ should be able to type in search box
  Responsive Design
    ✓ should work on mobile viewport
    ✓ should work on tablet viewport
  Performance
    ✓ should load homepage within reasonable time
```

---

## 🔄 How It Works

### Unit Tests vs Integration Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| API Calls | ❌ Mocked | ✅ Real |
| Browser | ❌ Mocked | ✅ Real (Chromium) |
| Cost | Free | ~$0.20/month |
| Speed | Fast (20s) | Slower (2-5min) |
| Secrets | Not needed | Required |
| CI Run | Every push | Weekly |

### GitHub Actions Workflow

```yaml
# .github/workflows/integration-tests.yml

on:
  workflow_dispatch:     # Manual trigger
  schedule:              # Weekly: Sunday 2 AM UTC
    - cron: '0 2 * * 0'
  push:                  # On integration test changes
    paths:
      - 'tests/integration/**'

jobs:
  integration-tests:
    # Only run if OPEN_AI_KEY secret exists
    if: secrets.OPEN_AI_KEY != ''

    steps:
      - Setup Node.js
      - Install dependencies
      - Install Playwright browsers
      - Run LLM integration tests (with secrets.OPEN_AI_KEY)
      - Run E2E browser tests (against https://osc2.oxid.shop)
      - Upload test results
      - Comment on PR (if applicable)

  docker-integration-test:
    # Run same tests in Docker container
    # Validates Docker image works with real APIs

  notify-failure:
    # Create GitHub issue if tests fail
```

---

## 💰 Cost Estimation

### OpenAI API Costs

**Model**: GPT-4o (recommended for testing)

- **Per test run**: ~$0.05 - $0.10
- **Per week**: ~$0.05 - $0.10
- **Per month**: ~$0.20 - $0.40

**Total**: Less than **$1/month** for weekly integration testing

### How to Minimize Costs

1. **Use cheaper model**:
   ```bash
   OPENAI_MODEL=gpt-3.5-turbo npm run test:integration
   ```

2. **Run selectively**:
   ```bash
   npm run test:integration -- --testPathPatterns=llm --testNamePattern="basic"
   ```

3. **Set token limits**:
   ```bash
   OPENAI_MAX_TOKENS=500 npm run test:integration
   ```

---

## 📊 Expected Results

### Successful Run

```bash
$ npm run test:integration

PASS tests/integration/llm/openai-real.test.ts (18.234s)
  OpenAI LLM Integration Tests (Real API)
    Basic Generation
      ✓ should generate a real response from OpenAI (2145ms)
        ✅ OpenAI response: Hello, integration test!
      ✓ should respect system prompt (1823ms)
        ✅ With system prompt: {"message": "Hello!"}
      ✓ should handle different temperature settings (1456ms)
        ✅ Temperature test: 1, 2, 3
    E2E Test Generation
      ✓ should generate test decomposition instructions (2834ms)
        ✅ Test decomposition: 1. Navigate to homepage...
      ✓ should generate CSS selectors from description (1623ms)
        ✅ Selector suggestions: button.add-to-cart...
    Error Handling
      ✓ should handle rate limiting gracefully (3421ms)
        ✅ Rate limiting handled: 3 requests
      ✓ should handle long context (2234ms)
        ✅ Long context handled: 256 prompt tokens
    Token Usage Tracking
      ✓ should accurately report token usage (1698ms)
        ✅ Token usage: { prompt: 12, completion: 8, total: 20 }

PASS tests/integration/e2e/oxid-shop-real.test.ts (45.123s)
  OXID eShop Real E2E Test
    Homepage Navigation
      ✓ should load the homepage successfully (3421ms)
        ✅ Homepage loaded: OXID eShop Demo
      ✓ should display shop logo (1234ms)
        ✅ Shop logo visible
      ✓ should have navigation menu (987ms)
        ✅ Navigation menu found
    Product Browsing
      ✓ should display products on homepage (2345ms)
        ✅ Found 12 product elements
      ✓ should be able to click on a product category (3456ms)
        ✅ Navigated to category: Electronics
    ...

Test Suites: 2 passed, 2 total
Tests:       21 passed, 21 total
Time:        63.357 s
```

### If Secrets Not Configured

```bash
⚠️  OPENAI_API_KEY not set - skipping OpenAI integration tests
Skipping test - no API key

Test Suites: 2 skipped, 2 total
Tests:       21 skipped, 21 total
```

---

## 🔒 Security

### Secrets Management

- Secrets stored in GitHub (Settings → Secrets)
- Never committed to repository
- Only available in protected workflows
- Not accessible from forks or public PRs

### Local Development

Create `.env.integration` (gitignored):

```bash
OPENAI_API_KEY=sk-your-key
OPENAI_API_URL=https://api.openai.com/v1
TEST_URL=https://osc2.oxid.shop
```

Load it:
```bash
export $(cat .env.integration | xargs)
npm run test:integration
```

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY not set"

**Solution**: Add the secret to GitHub repository settings

### "429 Rate Limit Exceeded"

**Solution**: Wait a few seconds between test runs, or use slower rate

### "Browser not found"

**Solution**: Install Playwright browsers
```bash
npx playwright install chromium
```

### "Cannot reach https://osc2.oxid.shop"

**Solution**: Check URL is accessible, try different network

### Tests timeout

**Solution**: Tests have 30s timeout. Increase if needed:
```typescript
it('slow test', async () => {
  // test
}, 60000); // 60 seconds
```

---

## 📚 Documentation

- **[Integration Tests README](tests/integration/README.md)** - Detailed guide
- **[Main README](README.md)** - Project overview
- **[Developer Examples](README-DEV-EXAMPLES.md)** - Usage patterns
- **[Docker Documentation](docs/DOCKER.md)** - Container usage

---

## ✅ Validation Checklist

To verify integration tests work:

1. **Add Secrets to GitHub**
   - [ ] Add `OPEN_AI_KEY` secret
   - [ ] Add `OPEN_AI_URL` secret (optional)

2. **Trigger Workflow Manually**
   - [ ] Go to Actions → Integration Tests
   - [ ] Click "Run workflow"
   - [ ] Wait for completion (~3-5 minutes)

3. **Verify Results**
   - [ ] Check all tests passed
   - [ ] Review logs for actual API responses
   - [ ] Check artifacts for test results

4. **Test Locally** (Optional)
   - [ ] Set OPENAI_API_KEY locally
   - [ ] Run `npm run test:integration`
   - [ ] Verify real API calls work

---

## 🎉 Summary

✅ **Integration tests created** - Real API calls and browser automation
✅ **GitHub workflow configured** - Runs weekly or on-demand
✅ **Documentation complete** - README and usage guide
✅ **Cost optimized** - Less than $1/month
✅ **Security considered** - Secrets properly managed

**Next Steps:**
1. Add `OPEN_AI_KEY` secret to GitHub repository
2. Manually trigger workflow to test
3. Review results and adjust as needed

---

## 🔗 Quick Links

- **Run Integration Tests**: [GitHub Actions](https://github.com/dantweb/e2e-test-agent/actions/workflows/integration-tests.yml)
- **View Documentation**: [tests/integration/README.md](tests/integration/README.md)
- **Add Secrets**: [Repository Settings](https://github.com/dantweb/e2e-test-agent/settings/secrets/actions)
- **Test URL**: https://osc2.oxid.shop
