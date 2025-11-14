# Integration Tests

This directory contains **real integration tests** that make actual API calls and perform real browser automation.

## ⚠️ Important Differences from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **API Calls** | ❌ Mocked | ✅ Real API calls |
| **Cost** | Free | 💰 Uses API credits |
| **Speed** | Fast (~20s) | Slower (~2-5 min) |
| **Network** | Not required | Required |
| **Secrets** | Not required | Required |
| **CI Frequency** | Every push | Weekly/Manual |

## 🔑 Required Environment Variables

### For LLM Tests
```bash
OPENAI_API_KEY=sk-...           # Your OpenAI API key
OPENAI_API_URL=https://...      # Optional: Custom OpenAI endpoint
```

### For E2E Browser Tests
```bash
TEST_URL=https://osc2.oxid.shop # Target website
HEADLESS=true                    # Run browser in headless mode
```

## 📁 Test Structure

```
tests/integration/
├── llm/
│   └── openai-real.test.ts     # Real OpenAI API integration tests
├── e2e/
│   └── oxid-shop-real.test.ts  # Real browser automation tests
└── README.md                    # This file
```

## 🚀 Running Integration Tests

### Locally

#### Prerequisites
1. Set environment variables:
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   export OPENAI_API_URL=https://api.openai.com/v1
   export TEST_URL=https://osc2.oxid.shop
   ```

2. Install dependencies:
   ```bash
   npm ci
   npx playwright install chromium
   ```

#### Run All Integration Tests
```bash
npm run test:integration
```

#### Run Only LLM Tests
```bash
npm run test:integration -- --testPathPatterns=llm
```

#### Run Only E2E Tests
```bash
npm run test:integration -- --testPathPatterns=e2e
```

#### Run with Visible Browser
```bash
HEADLESS=false npm run test:integration -- --testPathPatterns=e2e
```

### In Docker

```bash
# Build test image
docker build -f Dockerfile.test -t e2e-agent:test .

# Run integration tests
docker run --rm \
  -e OPENAI_API_KEY=sk-your-key \
  -e TEST_URL=https://osc2.oxid.shop \
  e2e-agent:test \
  npm run test:integration
```

### In GitHub Actions

Integration tests run automatically:
- **Weekly**: Every Sunday at 2 AM UTC
- **Manual**: Via workflow_dispatch
- **On Changes**: When integration test files are modified

#### Manual Trigger
1. Go to: Actions → Integration Tests
2. Click "Run workflow"
3. Optionally specify TEST_URL
4. Click "Run workflow"

## 🧪 Test Coverage

### LLM Integration Tests (`llm/openai-real.test.ts`)

Tests real OpenAI API integration:

1. **Basic Generation**
   - ✅ Real API response
   - ✅ System prompt handling
   - ✅ Temperature settings

2. **E2E Test Generation**
   - ✅ Test decomposition
   - ✅ CSS selector generation

3. **Error Handling**
   - ✅ Rate limiting
   - ✅ Long context

4. **Token Usage**
   - ✅ Accurate token tracking

### E2E Browser Tests (`e2e/oxid-shop-real.test.ts`)

Tests real browser automation on OXID eShop:

1. **Homepage Navigation**
   - ✅ Page loads
   - ✅ Logo visible
   - ✅ Navigation menu

2. **Product Browsing**
   - ✅ Products displayed
   - ✅ Category navigation

3. **Add to Cart Flow**
   - ✅ Cart buttons found
   - ✅ Cart icon/link visible

4. **Search Functionality**
   - ✅ Search box exists
   - ✅ Search input works

5. **Responsive Design**
   - ✅ Mobile viewport
   - ✅ Tablet viewport

6. **Performance**
   - ✅ Page load time

## 📊 Expected Output

### Successful Run
```bash
$ npm run test:integration

PASS tests/integration/llm/openai-real.test.ts
  OpenAI LLM Integration Tests (Real API)
    Basic Generation
      ✓ should generate a real response from OpenAI (2145ms)
      ✅ OpenAI response: Hello, integration test!
      ✓ should respect system prompt (1823ms)
      ✓ should handle different temperature settings (1456ms)
    ...

PASS tests/integration/e2e/oxid-shop-real.test.ts
  OXID eShop Real E2E Test
    Homepage Navigation
      ✓ should load the homepage successfully (3421ms)
      ✅ Homepage loaded: OXID eShop Demo
      ✓ should display shop logo (1234ms)
      ...

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
Time:        34.567 s
```

### If API Key Missing
```bash
⚠️  OPENAI_API_KEY not set - skipping OpenAI integration tests
Skipping test - no API key
```

## 💰 Cost Considerations

### OpenAI API Costs (Approximate)

- Each LLM test: ~$0.001 - $0.01
- Full LLM test suite: ~$0.05 - $0.10
- Per month (weekly): ~$0.20 - $0.40

**Total monthly cost: < $1** for integration testing

### Tips to Minimize Costs

1. **Use smaller models** for testing:
   ```bash
   OPENAI_MODEL=gpt-3.5-turbo npm run test:integration
   ```

2. **Run selectively**:
   ```bash
   npm run test:integration -- --testNamePattern="basic"
   ```

3. **Set token limits**:
   ```bash
   OPENAI_MAX_TOKENS=500 npm run test:integration
   ```

## 🐛 Troubleshooting

### API Key Issues

**Problem**: Tests skip with "no API key" message
```bash
⚠️  OPENAI_API_KEY not set - skipping tests
```

**Solution**: Set the environment variable
```bash
export OPENAI_API_KEY=sk-your-key-here
npm run test:integration
```

### Rate Limiting

**Problem**: `429 Too Many Requests` errors

**Solution**: Add delays between tests or use rate limiting logic

### Browser Not Found

**Problem**: `browserType.launch: Executable doesn't exist`

**Solution**: Install Playwright browsers
```bash
npx playwright install chromium
```

### Test Timeouts

**Problem**: Tests timeout after 5 seconds

**Solution**: Integration tests have 30s timeout by default. If needed, increase:
```typescript
it('slow test', async () => {
  // test code
}, 60000); // 60 second timeout
```

### Network Issues

**Problem**: Cannot reach test URL

**Solution**:
1. Check URL is accessible
2. Check firewall/VPN settings
3. Try different network

## 🔒 Security Notes

### GitHub Secrets

Integration tests use GitHub Secrets:
- `secrets.OPEN_AI_KEY` - OpenAI API key
- `secrets.OPEN_AI_URL` - OpenAI API URL (optional)

These are **NOT** available on:
- Pull requests from forks
- Public workflows without permission

### Local Development

**Never commit API keys!**

Use `.env` file (gitignored):
```bash
OPENAI_API_KEY=sk-your-key
OPENAI_API_URL=https://api.openai.com/v1
```

Or export temporarily:
```bash
export OPENAI_API_KEY=sk-your-key
npm run test:integration
unset OPENAI_API_KEY
```

## 📈 CI/CD Integration

### Workflow Configuration

File: `.github/workflows/integration-tests.yml`

**Triggers:**
- Weekly: Sunday 2 AM UTC
- Manual: workflow_dispatch
- On changes to integration tests

**Jobs:**
1. `integration-tests` - Run tests with Node.js
2. `docker-integration-test` - Run tests in Docker
3. `notify-failure` - Create issue if tests fail

### Viewing Results

1. Go to: Actions → Integration Tests
2. Click on the latest run
3. View logs and artifacts

## 🎯 Best Practices

1. **Keep tests focused**: Each test should verify one thing
2. **Use descriptive names**: Clear test descriptions
3. **Clean up resources**: Close browsers, clean state
4. **Handle flakiness**: Add retries for network-dependent tests
5. **Mock when possible**: Use integration tests sparingly
6. **Monitor costs**: Check OpenAI usage dashboard
7. **Test error cases**: Don't just test happy paths

## 📚 Related Documentation

- [Unit Tests](../unit/README.md) - Fast, mocked tests
- [Docker Documentation](../../docs/DOCKER.md) - Running in containers
- [Developer Examples](../../README-DEV-EXAMPLES.md) - Real-world usage
- [GitHub Actions](.github/workflows/integration-tests.yml) - CI configuration

## 🆘 Need Help?

- Check main README: [README.md](../../README.md)
- Review examples: [README-DEV-EXAMPLES.md](../../README-DEV-EXAMPLES.md)
- Open issue: [GitHub Issues](https://github.com/dantweb/e2e-test-agent/issues)
