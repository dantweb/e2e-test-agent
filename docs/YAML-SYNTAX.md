# YAML Test Specification Syntax

Complete reference for writing E2E test specifications in YAML format for the E2E Test Agent.

---

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [Top-Level Properties](#top-level-properties)
- [Jobs Specification](#jobs-specification)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [Validation Rules](#validation-rules)

---

## Overview

The E2E Test Agent uses YAML files to define test scenarios in natural language. The LLM (Large Language Model) then decomposes these high-level descriptions into executable Playwright commands.

### Basic Concept

```yaml
test-name:
  url: https://example.com
  timeout: 30000
  jobs:
    - name: job-name
      prompt: What the test should do
      acceptance:
        - Success criterion 1
        - Success criterion 2
```

---

## File Structure

### Minimal Example

```yaml
my-test:
  url: https://example.com
  jobs:
    - name: simple-task
      prompt: Click the login button
      acceptance:
        - Login button is clicked
```

### Full Example

```yaml
test-name:
  environment: production
  url: https://example.com
  timeout: 60000
  viewport:
    width: 1920
    height: 1080
  jobs:
    - name: job-1
      prompt: |
        Navigate to the homepage
        Verify the logo is visible
      acceptance:
        - Homepage loads successfully
        - Logo is displayed
    - name: job-2
      prompt: Search for "test"
      acceptance:
        - Search results appear
```

---

## Top-Level Properties

### Test Name (Required)

The root key that names your test. Use kebab-case or snake_case.

```yaml
shopping-cart-test:  # ✅ Good
  # ...

ShoppingCartTest:    # ❌ Avoid
  # ...
```

### `url` (Required)

The starting URL for the test.

```yaml
url: https://example.com
```

**Type**: `string`
**Format**: Must be a valid HTTP/HTTPS URL

### `environment` (Optional)

The environment name (for documentation purposes).

```yaml
environment: production
# or
environment: staging
# or
environment: development
```

**Type**: `string`
**Default**: Not set
**Common values**: `production`, `staging`, `development`, `qa`

### `timeout` (Optional)

Maximum time in milliseconds for the entire test.

```yaml
timeout: 30000  # 30 seconds
```

**Type**: `number` (milliseconds)
**Default**: `30000` (30 seconds)
**Range**: `1000` - `600000` (1 second to 10 minutes)

### `viewport` (Optional)

Browser viewport dimensions.

```yaml
viewport:
  width: 1920
  height: 1080
```

**Type**: `object`
**Properties**:
- `width` (number): Viewport width in pixels
- `height` (number): Viewport height in pixels

**Default**: Playwright default (usually 1280x720)

---

## Jobs Specification

Jobs are the individual test steps or scenarios. Each job contains a natural language description that the LLM will decompose into executable commands.

### Job Structure

```yaml
jobs:
  - name: job-identifier
    prompt: |
      Natural language description of what to do
    acceptance:
      - Success criterion 1
      - Success criterion 2
      - Success criterion N
```

### `name` (Required)

Unique identifier for the job. Use kebab-case or snake_case.

```yaml
name: user-login
name: add-to-cart
name: verify-checkout
```

**Type**: `string`
**Requirements**:
- Must be unique within the test
- Use kebab-case or snake_case
- Should be descriptive

### `prompt` (Required)

Natural language description of what the test should do. This is what the LLM will read to generate test commands.

#### Simple Prompt

```yaml
prompt: Click the login button and verify redirect
```

#### Multi-line Prompt (Recommended for complex jobs)

```yaml
prompt: |
  Navigate to the login page
  Enter email: user@example.com
  Enter password: testpass123
  Click the login button
  Verify user dashboard is displayed
```

**Type**: `string` (can be multi-line using `|` or `>`)
**Best Practices**:
- Be specific and clear
- Include selectors when known (e.g., "Click button with class .login-btn")
- Mention expected outcomes
- Use imperative mood ("Click", "Enter", "Verify")

#### Prompt Writing Tips

**Good Prompts** ✅

```yaml
# Specific with details
prompt: |
  Click the "Add to Cart" button for the first product
  Wait for the cart modal to appear
  Verify the modal shows "Item added successfully"
  Close the modal by clicking the X button

# Includes selectors when known
prompt: |
  Click the login link in the navigation bar (selector: .nav-login)
  Fill the email field #email with user@test.com
  Fill the password field #password with testpass
  Click the submit button

# Clear expected outcomes
prompt: |
  Click the "Next" button
  Wait for the payment page to load
  Verify the URL contains "/checkout/payment"
  Verify the page title is "Payment Information"
```

**Poor Prompts** ❌

```yaml
# Too vague
prompt: Do the login thing

# No verification
prompt: Click some buttons

# Unclear expectations
prompt: Test the form
```

### `acceptance` (Required)

List of success criteria that define when the job has completed successfully.

```yaml
acceptance:
  - Login page loads
  - Email field is visible
  - Password field is visible
  - Login button is enabled
```

**Type**: `array` of `string`
**Requirements**:
- At least one criterion required
- Should be specific and testable
- Will be used by LLM to understand success conditions

#### Acceptance Criteria Best Practices

**Specific and Testable** ✅

```yaml
acceptance:
  - User is redirected to /dashboard
  - Welcome message contains user's name
  - Navigation menu shows 5 items
  - Logout button is visible in top right
```

**Vague and Untestable** ❌

```yaml
acceptance:
  - Everything works
  - Page looks good
  - No errors
```

---

## Complete Examples

### Example 1: Simple Login Test

```yaml
login-test:
  url: https://example.com
  timeout: 30000
  jobs:
    - name: user-login
      prompt: |
        Click the "Login" link in the header
        Enter email: test@example.com
        Enter password: password123
        Click the "Sign In" button
        Verify the user dashboard loads
      acceptance:
        - Login page appears
        - Form fields are filled
        - Dashboard page loads
        - User name is displayed
```

### Example 2: E-commerce Shopping Flow

```yaml
shopping-cart-test:
  environment: production
  url: https://shop.example.com
  timeout: 60000
  viewport:
    width: 1920
    height: 1080
  jobs:
    - name: browse-products
      prompt: |
        Navigate to the "Electronics" category
        Verify at least 10 products are displayed
        Take note of the first product's name
      acceptance:
        - Category page loads
        - Products are visible
        - Product grid is populated

    - name: add-to-cart
      prompt: |
        Click the "Add to Cart" button for the first product
        Wait for the confirmation modal
        Verify modal shows "Added to cart"
        Close the modal
      acceptance:
        - Add to cart button is clicked
        - Modal appears and shows success
        - Cart badge updates to show 1 item

    - name: checkout
      prompt: |
        Click the shopping cart icon
        Click "Proceed to Checkout"
        Verify checkout page loads
      acceptance:
        - Cart page displays added items
        - Checkout page loads
        - Product details are correct
```

### Example 3: Form Validation Test

```yaml
form-validation-test:
  url: https://example.com/signup
  jobs:
    - name: test-empty-form
      prompt: |
        Click the "Sign Up" button without filling any fields
        Verify error messages appear for all required fields
      acceptance:
        - Email field shows "Email is required"
        - Password field shows "Password is required"
        - Submit button remains disabled or shows error

    - name: test-invalid-email
      prompt: |
        Enter invalid email: "notanemail"
        Enter valid password: "Test123!"
        Click submit
        Verify email validation error appears
      acceptance:
        - Email error message appears
        - Form is not submitted

    - name: test-successful-signup
      prompt: |
        Enter valid email: test@example.com
        Enter valid password: Test123!
        Click submit
        Verify success message or redirect
      acceptance:
        - Form is submitted successfully
        - Redirect to dashboard or success page
        - Welcome message appears
```

### Example 4: Multi-Step Wizard

```yaml
onboarding-wizard-test:
  url: https://app.example.com/onboarding
  timeout: 90000
  jobs:
    - name: step-1-personal-info
      prompt: |
        Fill in first name: John
        Fill in last name: Doe
        Fill in email: john.doe@example.com
        Click "Next" button
        Verify step 2 is displayed
      acceptance:
        - Step 1 form is completed
        - Step 2 loads
        - Progress indicator shows step 2

    - name: step-2-preferences
      prompt: |
        Select "Email notifications" checkbox
        Select "Dark mode" toggle
        Click "Next" button
        Verify step 3 is displayed
      acceptance:
        - Preferences are selected
        - Step 3 loads
        - Progress indicator shows step 3

    - name: step-3-confirmation
      prompt: |
        Review all entered information
        Click "Complete Setup" button
        Verify welcome dashboard appears
      acceptance:
        - Setup is completed
        - Dashboard loads
        - Onboarding badge is removed
```

### Example 5: PayPal Payment Integration

```yaml
paypal-payment-test:
  environment: production
  url: https://shop.example.com
  timeout: 180000
  jobs:
    - name: user-login
      prompt: |
        Login to the shop with credentials:
        - Email: test@example.com
        - Password: testpass123
        Click the user menu at .service-menu
        Fill in the login form
        Submit and verify login success
      acceptance:
        - User menu is visible after login
        - Login was successful
        - User is authenticated

    - name: add-products-to-cart
      prompt: |
        Add 2 products to the shopping cart
        Click on the first product's add-to-cart button using selector .productData .btn-default[type="submit"]
        Wait for the modal, close it by clicking .modal-dialog .modal-header .close
        Add a second product and close its modal
      acceptance:
        - First product is added to cart
        - Second product is added to cart
        - Cart has 2 items

    - name: checkout-with-paypal
      prompt: |
        Open the mini basket dropdown
        Click the checkout button
        Select PayPal as the payment method
        Accept terms and conditions
        Click "Order Now"
      acceptance:
        - PayPal payment method is selected
        - Order is placed
        - PayPal iframe or popup appears

    - name: complete-paypal-payment
      prompt: |
        Wait for PayPal iframe to load
        Complete PayPal login (may require manual intervention)
        Wait for redirect back to shop
        Verify thank you page is displayed
      acceptance:
        - PayPal authentication completes
        - User returns to shop
        - Thank you page is displayed
        - Order confirmation is visible
```

---

## Best Practices

### 1. Job Granularity

**✅ Good: One logical operation per job**

```yaml
jobs:
  - name: login
    prompt: Login with test credentials
    acceptance:
      - User is logged in

  - name: add-to-cart
    prompt: Add product to cart
    acceptance:
      - Product is in cart

  - name: checkout
    prompt: Complete checkout
    acceptance:
      - Order is placed
```

**❌ Bad: Everything in one job**

```yaml
jobs:
  - name: do-everything
    prompt: Login, add to cart, checkout, and verify
    acceptance:
      - Everything works
```

### 2. Use Specific Selectors

When you know the selectors, include them in the prompt:

```yaml
prompt: |
  Click the login button with selector button.login-btn
  Fill the email field #email with user@test.com
  Fill the password field input[name="password"] with testpass
```

### 3. Include Wait Conditions

```yaml
prompt: |
  Click the submit button
  Wait for the success message to appear
  Verify the message text is "Submission successful"
```

### 4. Order Jobs Logically

```yaml
jobs:
  - name: setup           # First
  - name: main-action     # Second
  - name: verification    # Third
  - name: cleanup         # Last
```

### 5. Use Descriptive Names

```yaml
# ✅ Good
- name: verify-cart-total-calculation
- name: apply-discount-code
- name: select-shipping-method

# ❌ Bad
- name: test1
- name: do-stuff
- name: check
```

### 6. Environment Variables (Advanced)

While not directly supported in the YAML syntax, you can use placeholders:

```yaml
prompt: |
  Login with email: ${TEST_USER_EMAIL}
  Enter password: ${TEST_USER_PASSWORD}
```

Then set environment variables before running:
```bash
export TEST_USER_EMAIL=user@test.com
export TEST_USER_PASSWORD=testpass
```

---

## Validation Rules

### Required Fields

✅ **Must have:**
- Test name (root key)
- `url`
- `jobs` array with at least one job
- Each job must have: `name`, `prompt`, `acceptance`

❌ **Will fail validation:**

```yaml
# Missing url
my-test:
  jobs:
    - name: test
      prompt: Do something
      acceptance:
        - Done

# Missing jobs
my-test:
  url: https://example.com

# Missing acceptance
my-test:
  url: https://example.com
  jobs:
    - name: test
      prompt: Do something
```

### Data Types

- **`url`**: Must be a valid HTTP/HTTPS URL string
- **`timeout`**: Must be a positive number (milliseconds)
- **`viewport.width`**: Must be a positive integer
- **`viewport.height`**: Must be a positive integer
- **`jobs`**: Must be an array
- **`acceptance`**: Must be an array of strings

### Naming Conventions

**Job names should:**
- Be unique within the test
- Use kebab-case or snake_case
- Be descriptive and readable
- Contain only alphanumeric characters, hyphens, and underscores

**Valid:**
```yaml
name: user-login
name: add_to_cart
name: verify-checkout-total
```

**Invalid:**
```yaml
name: User Login     # No spaces
name: add.to.cart    # No dots
name: test@checkout  # No special characters
```

---

## YAML Syntax Tips

### Multi-line Strings

**Literal block (`|`)** - Preserves line breaks

```yaml
prompt: |
  Line 1
  Line 2
  Line 3
```

**Folded block (`>`)** - Joins lines into one

```yaml
prompt: >
  This will be
  one long line
  in the output
```

### Comments

```yaml
# This is a comment
jobs:
  - name: test  # Inline comment
    prompt: Do something
    # Multi-line comments:
    # Line 1
    # Line 2
    acceptance:
      - Success
```

### Anchors and Aliases (Advanced)

Reuse common configurations:

```yaml
common-acceptance: &common
  - Page loads without errors
  - No console errors

test-1:
  url: https://example.com
  jobs:
    - name: job-1
      prompt: Test something
      acceptance:
        - *common
        - Additional criterion
```

---

## Troubleshooting

### Common Errors

**Error: "url is required"**
```yaml
# ❌ Wrong
my-test:
  jobs: []

# ✅ Correct
my-test:
  url: https://example.com
  jobs: []
```

**Error: "jobs must be an array"**
```yaml
# ❌ Wrong
jobs:
  name: test

# ✅ Correct
jobs:
  - name: test
```

**Error: "Invalid YAML syntax"**
```yaml
# ❌ Wrong - inconsistent indentation
my-test:
  url: https://example.com
   jobs:  # Extra space
  - name: test

# ✅ Correct - consistent 2-space indentation
my-test:
  url: https://example.com
  jobs:
    - name: test
```

---

## Next Steps

- See [OXTEST-SYNTAX.md](./OXTEST-SYNTAX.md) for the generated OXTest format
- See [API.md](./API.md) for CLI usage
- See [examples](../demo/) for more YAML examples

---

## Related Documentation

- [OXTest Syntax Reference](./OXTEST-SYNTAX.md)
- [Getting Started Guide](./e2e-tester-agent/GETTING_STARTED.md)
- [API Documentation](./API.md)
- [Demo Examples](../demo/README.md)
