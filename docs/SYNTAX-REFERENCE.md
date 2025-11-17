# E2E Test Agent - Complete Syntax Reference

Quick navigation guide to all syntax documentation.

---

## Documentation Index

### 📝 [YAML Syntax Reference](./YAML-SYNTAX.md)
**Complete guide to writing test specifications in YAML format**

Learn how to write natural language test specifications that the LLM will convert into executable tests.

**Topics covered:**
- YAML file structure
- Job specifications with prompts and acceptance criteria
- Environment configuration
- Viewport settings
- Multi-step test scenarios
- Best practices and validation rules

**Start here if:** You want to write high-level test descriptions in natural language.

---

### 🔧 [OXTest Syntax Reference](./OXTEST-SYNTAX.md)
**Complete guide to the OXTest domain-specific language**

Reference for the intermediate format between YAML and Playwright - the actual commands that get executed.

**Topics covered:**
- All command types (navigation, interaction, assertion, utility)
- Selector strategies (CSS, XPath, text, role, testid, placeholder)
- Parameter syntax and quoting rules
- Complete command reference with examples
- Advanced features and best practices

**Start here if:** You want to understand or write OXTest commands directly.

---

## Quick Start Examples

### Example 1: YAML → OXTest → Playwright

**Input: YAML Specification**
```yaml
login-test:
  url: https://example.com
  jobs:
    - name: user-login
      prompt: |
        Click the login button
        Enter email: test@example.com
        Enter password: password123
        Click submit
        Verify dashboard loads
      acceptance:
        - User is logged in
        - Dashboard is visible
```

**Generated: OXTest**
```oxtest
# Step: user-login
navigate url=https://example.com
click css=button.login
fill css=#email value=test@example.com
fill css=#password value=password123
click css=button[type="submit"]
wait duration=2000
assertVisible css=.dashboard
assertUrl pattern=.*/dashboard
```

**Generated: Playwright**
```typescript
test('login-test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button.login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await expect(page.locator('.dashboard')).toBeVisible();
  await expect(page).toHaveURL(/.*\/dashboard/);
});
```

---

## Workflow Overview

```
┌─────────────────┐
│  Write YAML     │  Natural language test description
│  Specification  │  (What you write)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Processes  │  Claude/GPT decomposes into steps
│  Natural        │  (Automatic)
│  Language       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Generates      │  Domain-specific language
│  OXTest         │  (Intermediate format)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Converts to    │  TypeScript/JavaScript
│  Playwright     │  (Final executable test)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Executes Test  │  Real browser automation
│  in Browser     │  (Chrome, Firefox, Safari)
└─────────────────┘
```

---

## Command Categories

### Navigation Commands
Move between pages and control browser history.

- `navigate` - Go to URL
- `goBack` - Browser back
- `goForward` - Browser forward
- `reload` - Refresh page

**See:** [OXTEST-SYNTAX.md#navigation-commands](./OXTEST-SYNTAX.md#navigation-commands)

---

### Interaction Commands
Interact with page elements.

- `click` - Click elements
- `fill` - Fill input fields
- `type` - Type text
- `press` - Press keyboard keys
- `check`/`uncheck` - Toggle checkboxes
- `selectOption` - Select dropdown options
- `hover` - Mouse hover
- `focus`/`blur` - Focus control

**See:** [OXTEST-SYNTAX.md#interaction-commands](./OXTEST-SYNTAX.md#interaction-commands)

---

### Assertion Commands
Verify page state and element properties.

- `assertVisible`/`assertHidden` - Visibility checks
- `assertText` - Text content verification
- `assertValue` - Input value verification
- `assertEnabled`/`assertDisabled` - Element state
- `assertChecked`/`assertUnchecked` - Checkbox state
- `assertUrl` - URL verification
- `assertTitle` - Page title verification

**See:** [OXTEST-SYNTAX.md#assertion-commands](./OXTEST-SYNTAX.md#assertion-commands)

---

### Utility Commands
Control test flow and capture information.

- `wait` - Wait for duration
- `waitForSelector` - Wait for element
- `screenshot` - Capture screenshot
- `setViewport` - Set browser size

**See:** [OXTEST-SYNTAX.md#utility-commands](./OXTEST-SYNTAX.md#utility-commands)

---

## Selector Strategies

| Strategy | Use Case | Example |
|----------|----------|---------|
| **css** | CSS selectors (most common) | `css=button.login` |
| **text** | Match by text content | `text="Click me"` |
| **testid** | Data test ID (most stable) | `testid=submit-btn` |
| **role** | ARIA roles (accessible) | `role=button` |
| **xpath** | XPath expressions | `xpath=//button[@id='login']` |
| **placeholder** | Input placeholders | `placeholder="Enter email"` |

**See:** [OXTEST-SYNTAX.md#selector-strategies](./OXTEST-SYNTAX.md#selector-strategies)

---

## Common Patterns

### Pattern 1: Login Flow

**YAML:**
```yaml
login-test:
  url: https://app.example.com
  jobs:
    - name: login
      prompt: |
        Navigate to login page
        Enter credentials
        Submit form
        Verify dashboard loads
      acceptance:
        - User is authenticated
        - Dashboard is visible
```

**OXTest:**
```oxtest
navigate url=https://app.example.com/login
fill css=#email value=user@example.com
fill css=#password value=pass123
click css=button[type="submit"]
wait duration=2000
assertVisible css=.dashboard
```

---

### Pattern 2: Form Validation

**YAML:**
```yaml
form-validation-test:
  url: https://example.com/signup
  jobs:
    - name: test-empty-form
      prompt: |
        Submit form without filling fields
        Verify error messages appear
      acceptance:
        - Validation errors are shown
        - Form is not submitted
```

**OXTest:**
```oxtest
navigate url=https://example.com/signup
click css=button[type="submit"]
assertVisible css=.error-message
assertText css=.error-email text="Email is required"
```

---

### Pattern 3: Multi-Step Wizard

**YAML:**
```yaml
wizard-test:
  url: https://example.com/setup
  jobs:
    - name: step-1
      prompt: Fill step 1 and proceed
      acceptance:
        - Step 1 completed
        - Step 2 loads

    - name: step-2
      prompt: Fill step 2 and proceed
      acceptance:
        - Step 2 completed
        - Final page loads
```

**OXTest:**
```oxtest
# Step 1
navigate url=https://example.com/setup
fill css=#name value="John Doe"
click css=button.next
assertVisible css=.step-2

# Step 2
fill css=#email value=john@example.com
click css=button.complete
assertVisible css=.success-page
```

---

## Tips & Tricks

### 1. Use Test IDs for Stable Tests

```html
<!-- In your HTML -->
<button data-testid="submit-button">Submit</button>
```

```oxtest
# In your test (won't break if classes change)
click testid=submit-button
```

### 2. Add Fallback Selectors

```oxtest
# If first selector fails, try second
click css=button.login fallback=text="Login"
```

### 3. Wait After Dynamic Actions

```oxtest
click css=button.submit
wait duration=2000  # Wait for response
assertVisible css=.success-message
```

### 4. Use Comments for Clarity

```oxtest
# === Authentication Section ===
navigate url=https://example.com/login

# Enter credentials
fill css=#email value=user@test.com
fill css=#password value=pass

# Submit and verify
click css=button.submit
assertVisible css=.dashboard
```

### 5. Take Screenshots at Key Points

```oxtest
# Before action
screenshot path=before-submit.png

# Perform action
click css=button.submit
wait duration=2000

# After action
screenshot path=after-submit.png
```

---

## Troubleshooting

### YAML Issues

**Problem:** Test not generating correctly

**Solution:** Check YAML syntax - ensure proper indentation (2 spaces)

```yaml
# ❌ Wrong
my-test:
url: https://example.com

# ✅ Correct
my-test:
  url: https://example.com
```

**See:** [YAML-SYNTAX.md#validation-rules](./YAML-SYNTAX.md#validation-rules)

---

### OXTest Issues

**Problem:** Selector not found

**Solution:** Use fallback selectors or more specific selectors

```oxtest
# Try multiple strategies
click css=button.login fallback=text="Login" fallback=testid=login-btn
```

**See:** [OXTEST-SYNTAX.md#fallback-selectors](./OXTEST-SYNTAX.md#advanced-features)

---

### Timing Issues

**Problem:** Test fails because element hasn't loaded yet

**Solution:** Add explicit waits

```oxtest
click css=button.submit
waitForSelector css=.result timeout=5000
assertVisible css=.result
```

**See:** [OXTEST-SYNTAX.md#utility-commands](./OXTEST-SYNTAX.md#utility-commands)

---

## Related Documentation

- 📘 [Getting Started Guide](./e2e-tester-agent/GETTING_STARTED.md)
- 🔌 [API Documentation](./API.md)
- 🐳 [Docker Guide](./DOCKER.md)
- 📦 [Examples Directory](../demo/)
- 🧪 [Running Generated Tests](./RUNNING-GENERATED-TESTS.md)

---

## Quick Reference Cards

### YAML Quick Reference
```yaml
test-name:
  url: <url>
  timeout: <milliseconds>
  viewport:
    width: <pixels>
    height: <pixels>
  jobs:
    - name: <job-name>
      prompt: |
        <natural language description>
      acceptance:
        - <success criterion>
```

### OXTest Quick Reference
```oxtest
# Navigation
navigate url=<url>

# Interaction
click css=<selector>
fill css=<selector> value=<text>
press key=<keyName>

# Assertions
assertVisible css=<selector>
assertText css=<selector> text=<expected>

# Utility
wait duration=<ms>
screenshot path=<filename>
```

---

## Getting Help

1. **Read the full syntax guides:**
   - [YAML-SYNTAX.md](./YAML-SYNTAX.md)
   - [OXTEST-SYNTAX.md](./OXTEST-SYNTAX.md)

2. **Check examples:**
   - [demo/](../demo/) directory

3. **Review test results:**
   - Check generated `.ox.test` files
   - Review Playwright `.spec.ts` files

4. **Common issues:**
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Happy Testing!** 🎉
