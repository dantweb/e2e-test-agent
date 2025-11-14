# E2E Test Agent - Demo Workflow

This directory contains demo artifacts showing the complete workflow from natural language specifications to executed tests with reports.

## 📋 Demo Files

- `shopping-cart-test.yaml` - Sample YAML specification in natural language
- `sample.ox.test` - Example OXTest DSL file showing the domain-specific language format

## 🚀 Complete Workflow Demo

### 1. Generate Tests from YAML

```bash
# Generate Playwright and OXTest files from natural language specification
npm run e2e-test-agent -- \
  --src=demo/shopping-cart-test.yaml \
  --output=demo/generated \
  --oxtest
```

**Output:**
- `generated/shopping-cart-test.spec.ts` - Playwright test file
- `generated/shopping-cart-test.ox.test` - OXTest DSL file

### 2. Generate, Execute, and Report

```bash
# Complete workflow: Generate → Execute → Create Reports
npm run e2e-test-agent -- \
  --src=demo/shopping-cart-test.yaml \
  --output=demo/generated \
  --oxtest \
  --execute \
  --reporter=html,json,junit,console
```

**Output:**
- Generated test files (.spec.ts, .ox.test)
- Test execution with real browser
- Multiple report formats:
  - `shopping-cart-test.html` - Beautiful HTML dashboard
  - `shopping-cart-test.json` - Machine-readable JSON
  - `shopping-cart-test.xml` - JUnit format for CI/CD
  - Console output with colors and progress

### 3. Execute Existing OXTest File

```bash
# Parse and execute the sample.ox.test file
npm run e2e-test-agent -- \
  --src=demo/sample-wrapper.yaml \
  --output=demo/generated \
  --oxtest \
  --execute \
  --reporter=html
```

## 📊 Report Formats

### HTML Report
Beautiful, interactive dashboard with:
- Test summary (passed/failed/blocked)
- Execution timeline
- Detailed subtask results
- Error messages and screenshots
- Responsive design for mobile/desktop

### JSON Report
Machine-readable format for:
- CI/CD pipeline integration
- Custom tooling and analysis
- Test history tracking
- Metrics collection

### JUnit XML Report
Standard format for:
- Jenkins, GitLab CI, GitHub Actions
- Test reporting in CI systems
- Integration with existing tooling
- Historical trend analysis

### Console Report
Enhanced terminal output with:
- Color-coded status indicators
- Progress tracking
- Duration metrics
- Real-time feedback

## 🎯 Key Features Demonstrated

1. **AI-Powered Test Generation**
   - Natural language → Executable tests
   - Uses LLM to understand intent
   - Generates both Playwright and OXTest formats

2. **Automated Execution**
   - Parses OXTest DSL files
   - Executes with real Playwright browser
   - Tracks state transitions (Pending → InProgress → Completed/Failed)

3. **Comprehensive Reporting**
   - Multiple output formats
   - Detailed execution metadata
   - Error tracking and screenshots
   - CI/CD ready formats

4. **Developer-Friendly Workflow**
   - Single command for end-to-end workflow
   - Clear progress indicators
   - Helpful error messages
   - Fast iteration cycles

## 🔧 Environment Variables

Create a `.env` file with:

```bash
# LLM Provider Configuration
OPENAI_API_KEY=sk-your-api-key
OPENAI_API_URL=https://api.openai.com/v1  # Optional: Custom endpoint
OPENAI_MODEL=gpt-4o                        # Optional: Default model

# Browser Configuration
HEADLESS=true                              # Run browser in headless mode
BROWSER=chromium                           # Browser to use (chromium/firefox/webkit)
