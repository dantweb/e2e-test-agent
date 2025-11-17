# OXTest Format Syntax Reference

Complete reference for the OXTest domain-specific language (DSL) - the intermediate format between YAML specifications and Playwright tests.

---

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [Command Syntax](#command-syntax)
- [Selector Strategies](#selector-strategies)
- [Command Reference](#command-reference)
  - [Navigation Commands](#navigation-commands)
  - [Interaction Commands](#interaction-commands)
  - [Assertion Commands](#assertion-commands)
  - [Utility Commands](#utility-commands)
- [Advanced Features](#advanced-features)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)

---

## Overview

OXTest is a domain-specific language (DSL) for writing browser automation tests. It provides a simple, human-readable syntax that maps directly to Playwright commands.

### What is OXTest?

- **Intermediate format** between YAML specs and Playwright tests
- **Human-readable** command syntax
- **LLM-generated** from natural language descriptions
- **Executable** by the E2E Test Agent

### File Extension

```
*.ox.test
```

### Basic Example

```oxtest
# Navigate to the page
navigate url=https://example.com

# Interact with elements
click css=button.login
fill css=#email value=user@test.com
press key=Enter

# Verify results
assertVisible css=.dashboard
assertText css=h1 text=Welcome
```

---

## File Structure

### Comments

Comments start with `#` and continue to the end of the line:

```oxtest
# This is a single-line comment
click css=button  # Inline comment
```

### Blank Lines

Blank lines are ignored and can be used for readability:

```oxtest
# Step 1: Navigate
navigate url=https://example.com

# Step 2: Login
click css=.login-btn
fill css=#email value=test@example.com
```

### Command Format

```
commandType parameter=value parameter=value ...
```

**Components:**
- **commandType**: The action to perform (e.g., `click`, `fill`, `navigate`)
- **parameters**: Key-value pairs separated by `=`
- **Multiple parameters**: Separated by spaces

---

## Command Syntax

### General Pattern

```oxtest
commandType param1=value1 param2=value2
```

### Parameter Rules

1. **No spaces around `=`**
   ```oxtest
   # ✅ Correct
   fill css=#email value=test@example.com

   # ❌ Wrong
   fill css = #email value = test@example.com
   ```

2. **Quoted values for strings with spaces**
   ```oxtest
   # ✅ Correct
   assertText css=h1 text="Welcome User"
   type css=input value="Hello World"

   # ❌ Wrong (will only type "Hello")
   type css=input value=Hello World
   ```

3. **Single or double quotes**
   ```oxtest
   fill css='#email' value="test@example.com"
   fill css="#email" value='test@example.com'
   ```

4. **Escape quotes inside quoted strings**
   ```oxtest
   assertText css=div text="He said \"Hello\""
   assertText css=div text='She\'s here'
   ```

---

## Selector Strategies

OXTest supports multiple selector strategies for locating elements.

### Supported Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| `css` | CSS selector | `css=button.primary` |
| `text` | Text content | `text="Click me"` |
| `xpath` | XPath expression | `xpath=//button[@class='primary']` |
| `testid` | Data test ID attribute | `testid=submit-button` |
| `role` | ARIA role | `role=button` |
| `placeholder` | Input placeholder | `placeholder="Enter email"` |

### CSS Selectors (Most Common)

```oxtest
# By ID
click css=#login-button

# By class
click css=.btn-primary

# By attribute
click css=button[type="submit"]

# By nested selectors
click css=.form-group input[name="email"]

# Pseudo-selectors
click css=li:first-child
click css=button:nth-of-type(2)
```

### Text Selectors

Match elements by their text content:

```oxtest
# Exact text match
click text="Sign In"

# Partial text match (use CSS contains)
click css=button:has-text("Sign")
```

### Test ID Selectors (Recommended for Stability)

```oxtest
# Using data-testid attribute
click testid=login-button
fill testid=email-input value=user@test.com
```

HTML:
```html
<button data-testid="login-button">Login</button>
<input data-testid="email-input" type="email">
```

### ARIA Role Selectors

```oxtest
# By role
click role=button
fill role=textbox value=test

# Role with name
click role=button[name="Submit"]
```

### XPath Selectors

```oxtest
# XPath expression
click xpath=//button[contains(@class, 'submit')]
assertVisible xpath=//div[@id='result']
```

### Placeholder Selectors

```oxtest
# Input by placeholder text
fill placeholder="Enter your email" value=user@test.com
click placeholder="Search..."
```

### Fallback Selectors

Use the `fallback` parameter to provide an alternative selector:

```oxtest
click css=button.login fallback=text="Login"
fill css=#email fallback=placeholder="Email" value=user@test.com
```

---

## Command Reference

### Navigation Commands

#### `navigate`

Navigate to a URL.

**Syntax:**
```oxtest
navigate url=<URL>
```

**Parameters:**
- `url` (required): The URL to navigate to

**Examples:**
```oxtest
navigate url=https://example.com
navigate url=https://example.com/login
navigate url=http://localhost:3000
```

---

#### `goBack`

Navigate back in browser history.

**Syntax:**
```oxtest
goBack
```

**Example:**
```oxtest
navigate url=https://example.com/page1
click css=a[href="/page2"]
goBack  # Returns to page1
```

---

#### `goForward`

Navigate forward in browser history.

**Syntax:**
```oxtest
goForward
```

**Example:**
```oxtest
goBack
goForward  # Goes forward again
```

---

#### `reload`

Reload the current page.

**Syntax:**
```oxtest
reload
```

**Example:**
```oxtest
reload
wait duration=2000
```

---

### Interaction Commands

#### `click`

Click on an element.

**Syntax:**
```oxtest
click <strategy>=<selector> [fallback=<fallback-selector>]
```

**Parameters:**
- Selector (required): Element to click
- `fallback` (optional): Alternative selector if first fails

**Examples:**
```oxtest
# Simple click
click css=button.submit

# With fallback
click css=#login-btn fallback=text="Login"

# Click by text
click text="Sign In"

# Click by test ID
click testid=submit-button

# Click specific element in list
click css=li:nth-child(3)
```

---

#### `fill`

Fill an input field (clears existing value first).

**Syntax:**
```oxtest
fill <strategy>=<selector> value=<text> [fallback=<fallback-selector>]
```

**Parameters:**
- Selector (required): Input element to fill
- `value` (required): Text to enter
- `fallback` (optional): Alternative selector

**Examples:**
```oxtest
# Simple fill
fill css=#email value=user@example.com

# Fill with spaces (use quotes)
fill css=#name value="John Doe"

# With fallback
fill css=#email fallback=placeholder="Email" value=test@example.com

# Fill password
fill css=input[type="password"] value=secretPass123
```

---

#### `type`

Type text into an element (does not clear existing value).

**Syntax:**
```oxtest
type <strategy>=<selector> value=<text>
```

**Parameters:**
- Selector (required): Element to type into
- `value` (required): Text to type

**Examples:**
```oxtest
# Type in search box
type css=#search value=laptop

# Type with existing text
type css=textarea value=" Additional text"
```

**Difference from `fill`:**
- `fill`: Clears field first, then enters text
- `type`: Appends to existing text

---

#### `press`

Press a keyboard key.

**Syntax:**
```oxtest
press key=<keyName>
```

**Parameters:**
- `key` (required): Key name to press

**Common Keys:**
- `Enter`, `Escape`, `Tab`, `Backspace`, `Delete`
- `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- `Space`, `Control`, `Alt`, `Shift`, `Meta`
- Single characters: `a`, `A`, `1`, `!`

**Examples:**
```oxtest
# Press Enter to submit
press key=Enter

# Press Escape to close modal
press key=Escape

# Press Tab to move to next field
press key=Tab

# Keyboard shortcuts (use with modifier)
press key=Control+a  # Select all
press key=Control+c  # Copy
```

---

#### `check`

Check a checkbox or radio button.

**Syntax:**
```oxtest
check <strategy>=<selector>
```

**Examples:**
```oxtest
# Check a checkbox
check css=#terms-checkbox

# Check radio button
check css=input[name="payment"][value="card"]
```

---

#### `uncheck`

Uncheck a checkbox.

**Syntax:**
```oxtest
uncheck <strategy>=<selector>
```

**Example:**
```oxtest
uncheck css=#newsletter-subscribe
```

---

#### `selectOption`

Select an option from a dropdown.

**Syntax:**
```oxtest
selectOption <strategy>=<selector> value=<optionValue>
```

**Parameters:**
- Selector (required): Select element
- `value` (required): Option value or label to select

**Examples:**
```oxtest
# Select by value
selectOption css=#country value=USA

# Select by visible text
selectOption css=#country value="United States"

# Select from multi-select
selectOption css=#languages value=English
```

---

#### `hover`

Hover over an element.

**Syntax:**
```oxtest
hover <strategy>=<selector>
```

**Example:**
```oxtest
# Hover to show dropdown
hover css=.menu-item

# Hover for tooltip
hover css=.help-icon
```

---

#### `focus`

Focus on an element.

**Syntax:**
```oxtest
focus <strategy>=<selector>
```

**Example:**
```oxtest
focus css=#email
```

---

#### `blur`

Remove focus from an element.

**Syntax:**
```oxtest
blur <strategy>=<selector>
```

**Example:**
```oxtest
blur css=#email
```

---

#### `clear`

Clear an input field.

**Syntax:**
```oxtest
clear <strategy>=<selector>
```

**Example:**
```oxtest
clear css=#search-input
```

---

### Assertion Commands

#### `assertVisible`

Assert that an element is visible.

**Syntax:**
```oxtest
assertVisible <strategy>=<selector> [fallback=<fallback-selector>]
```

**Examples:**
```oxtest
assertVisible css=.dashboard
assertVisible css=#welcome-message
assertVisible testid=success-banner

# With fallback
assertVisible css=.alert fallback=text="Success"
```

---

#### `assertHidden`

Assert that an element is hidden or doesn't exist.

**Syntax:**
```oxtest
assertHidden <strategy>=<selector>
```

**Example:**
```oxtest
assertHidden css=.loading-spinner
assertHidden css=#error-message
```

---

#### `assertText`

Assert that an element contains specific text.

**Syntax:**
```oxtest
assertText <strategy>=<selector> text=<expectedText>
```

**Parameters:**
- Selector (required): Element to check
- `text` (required): Expected text content

**Examples:**
```oxtest
# Exact text match
assertText css=h1 text="Welcome"

# Text with spaces
assertText css=.message text="Login successful"

# Partial match depends on implementation
assertText css=p text="Thank you"
```

---

#### `assertValue`

Assert that an input element has a specific value.

**Syntax:**
```oxtest
assertValue <strategy>=<selector> value=<expectedValue>
```

**Examples:**
```oxtest
# Assert input value
assertValue css=#email value=user@example.com

# Assert selected option
assertValue css=#country value=USA

# Assert checkbox value
assertValue css=#terms value=1
```

---

#### `assertEnabled`

Assert that an element is enabled (not disabled).

**Syntax:**
```oxtest
assertEnabled <strategy>=<selector>
```

**Example:**
```oxtest
assertEnabled css=button.submit
assertEnabled css=#save-button
```

---

#### `assertDisabled`

Assert that an element is disabled.

**Syntax:**
```oxtest
assertDisabled <strategy>=<selector>
```

**Example:**
```oxtest
assertDisabled css=button.submit
assertDisabled css=#confirm-button
```

---

#### `assertChecked`

Assert that a checkbox or radio button is checked.

**Syntax:**
```oxtest
assertChecked <strategy>=<selector>
```

**Example:**
```oxtest
assertChecked css=#terms-checkbox
assertChecked css=input[name="payment"][value="card"]
```

---

#### `assertUnchecked`

Assert that a checkbox or radio button is unchecked.

**Syntax:**
```oxtest
assertUnchecked <strategy>=<selector>
```

**Example:**
```oxtest
assertUnchecked css=#newsletter
```

---

#### `assertUrl`

Assert the current URL matches a pattern.

**Syntax:**
```oxtest
assertUrl pattern=<urlPattern>
```

**Parameters:**
- `pattern` (required): URL pattern (can be regex or string)

**Examples:**
```oxtest
# Exact URL
assertUrl pattern=https://example.com/dashboard

# Partial match (regex)
assertUrl pattern=.*/dashboard.*

# Contains specific path
assertUrl pattern=/profile
```

---

#### `assertTitle`

Assert the page title.

**Syntax:**
```oxtest
assertTitle text=<expectedTitle>
```

**Example:**
```oxtest
assertTitle text="Dashboard - MyApp"
assertTitle text="Login"
```

---

### Utility Commands

#### `wait`

Wait for a specified duration.

**Syntax:**
```oxtest
wait duration=<milliseconds>
```

**Parameters:**
- `duration` (required): Time to wait in milliseconds

**Examples:**
```oxtest
# Wait 1 second
wait duration=1000

# Wait 3 seconds
wait duration=3000

# Wait for animation
wait duration=500
```

---

#### `waitForSelector`

Wait for an element to appear.

**Syntax:**
```oxtest
waitForSelector <strategy>=<selector> [timeout=<milliseconds>]
```

**Parameters:**
- Selector (required): Element to wait for
- `timeout` (optional): Maximum wait time in milliseconds

**Examples:**
```oxtest
# Wait for element with default timeout
waitForSelector css=.result

# Wait with custom timeout
waitForSelector css=.loading timeout=5000

# Wait for specific element
waitForSelector testid=success-message timeout=3000
```

---

#### `screenshot`

Take a screenshot.

**Syntax:**
```oxtest
screenshot [path=<filename>] [fullPage=<boolean>]
```

**Parameters:**
- `path` (optional): Filename for the screenshot
- `fullPage` (optional): Whether to capture full page (default: false)

**Examples:**
```oxtest
# Simple screenshot
screenshot

# With filename
screenshot path=login-page.png

# Full page screenshot
screenshot path=full-page.png fullPage=true
```

---

#### `setViewport`

Set browser viewport size.

**Syntax:**
```oxtest
setViewport width=<pixels> height=<pixels>
```

**Parameters:**
- `width` (required): Viewport width in pixels
- `height` (required): Viewport height in pixels

**Examples:**
```oxtest
# Desktop viewport
setViewport width=1920 height=1080

# Mobile viewport
setViewport width=375 height=667

# Tablet viewport
setViewport width=768 height=1024
```

---

## Advanced Features

### Command Chaining

Execute multiple commands in sequence:

```oxtest
# Login flow
navigate url=https://example.com/login
fill css=#email value=user@test.com
fill css=#password value=password123
click css=button[type="submit"]
wait duration=2000
assertVisible css=.dashboard
```

### Conditional Logic (Via Comments)

Use comments to document conditional paths:

```oxtest
# If modal appears, close it
click css=.modal-close

# If error message shows, take screenshot
screenshot path=error-state.png
```

### Test Sections

Use comments to organize tests into sections:

```oxtest
# ========================================
# SECTION 1: Authentication
# ========================================

navigate url=https://example.com
click css=.login-link
fill css=#email value=user@test.com
fill css=#password value=pass123
click css=button.submit

# ========================================
# SECTION 2: Navigation
# ========================================

click css=a[href="/dashboard"]
assertUrl pattern=.*/dashboard

# ========================================
# SECTION 3: Verification
# ========================================

assertVisible css=.user-profile
assertText css=.username text="Test User"
```

---

## Complete Examples

### Example 1: Login Test

```oxtest
# Login Test - Basic Authentication Flow

# Navigate to login page
navigate url=https://example.com/login
wait duration=1000

# Fill credentials
fill css=#email value=testuser@example.com
fill css=#password value=SecurePass123

# Submit form
click css=button[type="submit"]
wait duration=2000

# Verify successful login
assertUrl pattern=.*/dashboard
assertVisible css=.user-menu
assertText css=h1 text="Welcome"

# Take screenshot
screenshot path=dashboard-logged-in.png
```

### Example 2: Shopping Cart Flow

```oxtest
# E-commerce Shopping Cart Test

# Step 1: Navigate to shop
navigate url=https://shop.example.com
waitForSelector css=.product-grid
assertVisible css=.product-card

# Step 2: Add products to cart
click css=.product-card:first-child button.add-to-cart
wait duration=500
click css=.modal .close-button

click css=.product-card:nth-child(2) button.add-to-cart
wait duration=500
click css=.modal .close-button

# Step 3: Verify cart badge
assertVisible css=.cart-badge
assertText css=.cart-badge text="2"

# Step 4: Open cart
click css=.cart-icon
waitForSelector css=.cart-drawer
assertVisible css=.cart-item

# Step 5: Proceed to checkout
click css=button.checkout
wait duration=2000

# Step 6: Verify checkout page
assertUrl pattern=.*/checkout
assertVisible css=.checkout-form
screenshot path=checkout-page.png
```

### Example 3: Form Validation

```oxtest
# Form Validation Test

# Navigate to form
navigate url=https://example.com/signup
wait duration=1000

# Test 1: Empty form submission
click css=button[type="submit"]
assertVisible css=.error-message
assertText css=.error-email text="Email is required"

# Test 2: Invalid email format
fill css=#email value=notanemail
click css=button[type="submit"]
assertText css=.error-email text="Invalid email format"

# Test 3: Password too short
fill css=#email value=valid@email.com
fill css=#password value=123
click css=button[type="submit"]
assertText css=.error-password text="Password must be at least 8 characters"

# Test 4: Valid submission
clear css=#password
fill css=#password value=ValidPass123!
check css=#terms-checkbox
click css=button[type="submit"]
wait duration=2000

# Verify success
assertUrl pattern=.*/welcome
assertVisible css=.success-message
screenshot path=signup-success.png
```

### Example 4: Responsive Testing

```oxtest
# Responsive Design Test

# Test desktop view
setViewport width=1920 height=1080
navigate url=https://example.com
assertVisible css=.desktop-nav
assertHidden css=.mobile-menu-icon
screenshot path=desktop-view.png

# Test tablet view
setViewport width=768 height=1024
reload
wait duration=1000
assertVisible css=.tablet-nav
screenshot path=tablet-view.png

# Test mobile view
setViewport width=375 height=667
reload
wait duration=1000
assertVisible css=.mobile-menu-icon
assertHidden css=.desktop-nav

# Open mobile menu
click css=.mobile-menu-icon
waitForSelector css=.mobile-menu
assertVisible css=.mobile-menu
screenshot path=mobile-menu-open.png
```

### Example 5: Multi-Step Form

```oxtest
# Multi-Step Wizard Test

# Step 1: Personal Information
navigate url=https://example.com/onboarding
wait duration=1000

fill css=#first-name value=John
fill css=#last-name value=Doe
fill css=#email value=john.doe@example.com
click css=button.next

# Verify step 2
wait duration=1000
assertUrl pattern=.*/onboarding/step-2
assertVisible css=.step-indicator.active[data-step="2"]

# Step 2: Preferences
check css=#email-notifications
check css=#dark-mode
selectOption css=#language value=English
click css=button.next

# Verify step 3
wait duration=1000
assertUrl pattern=.*/onboarding/step-3

# Step 3: Review and Confirm
assertVisible css=.review-section
assertText css=.review-name text="John Doe"
assertText css=.review-email text="john.doe@example.com"
click css=button.complete

# Verify completion
wait duration=2000
assertUrl pattern=.*/dashboard
assertVisible css=.welcome-banner
screenshot path=onboarding-complete.png
```

---

## Best Practices

### 1. Use Meaningful Comments

```oxtest
# ✅ Good: Explains the purpose
# Verify user is redirected to dashboard after login
assertUrl pattern=.*/dashboard

# ❌ Bad: States the obvious
# Assert URL
assertUrl pattern=.*/dashboard
```

### 2. Add Waits After Actions

```oxtest
# ✅ Good: Wait for action to complete
click css=button.submit
wait duration=2000
assertVisible css=.success-message

# ❌ Risky: No wait, might fail
click css=button.submit
assertVisible css=.success-message
```

### 3. Use Fallback Selectors

```oxtest
# ✅ Good: Provides fallback if CSS changes
click css=button.login fallback=text="Login"

# ❌ Risky: Fails if CSS class changes
click css=button.login
```

### 4. Verify Actions Completed

```oxtest
# ✅ Good: Verifies the action worked
click css=.add-to-cart
wait duration=500
assertVisible css=.cart-badge
assertText css=.cart-badge text="1"

# ❌ Missing verification
click css=.add-to-cart
```

### 5. Use Test IDs for Stable Selectors

```oxtest
# ✅ Best: Stable, won't break on CSS changes
click testid=submit-button
fill testid=email-input value=user@test.com

# ⚠️ OK but less stable: CSS can change
click css=button.submit
fill css=#email value=user@test.com
```

### 6. Group Related Commands

```oxtest
# ✅ Good: Organized and readable
# === Login Section ===
navigate url=https://example.com/login
fill css=#email value=user@test.com
fill css=#password value=pass
click css=button.submit

# === Dashboard Section ===
assertUrl pattern=.*/dashboard
assertVisible css=.user-profile
```

### 7. Take Screenshots at Key Points

```oxtest
# After important actions
click css=button.submit
wait duration=2000
screenshot path=after-submit.png

# On error states
assertVisible css=.error-message
screenshot path=error-state.png
```

### 8. Use Descriptive Filenames

```oxtest
# ✅ Good: Describes what's in the screenshot
screenshot path=login-page-initial-load.png
screenshot path=cart-with-2-items.png
screenshot path=checkout-payment-error.png

# ❌ Bad: Generic names
screenshot path=screenshot1.png
screenshot path=test.png
```

---

## Parsing Rules

### Tokenization

The OXTest parser tokenizes commands using these rules:

1. **Commands** are split by newlines
2. **Parameters** are split by spaces
3. **Key-value pairs** are split by `=`
4. **Quoted values** preserve spaces
5. **Comments** starting with `#` are ignored

### Parameter Extraction

```oxtest
click css=button.login fallback=text="Sign In"
```

Parsed as:
- Command: `click`
- Parameters:
  - `css` → `button.login`
  - `fallback` → `text="Sign In"`

### Quote Handling

```oxtest
# Double quotes
assertText css=h1 text="Welcome User"
# Parsed: text = "Welcome User"

# Single quotes
assertText css=h1 text='Welcome User'
# Parsed: text = "Welcome User"

# Escaped quotes
assertText css=h1 text="She said \"Hi\""
# Parsed: text = "She said "Hi""
```

---

## Error Handling

### Common Syntax Errors

**Missing required parameter:**
```oxtest
# ❌ Error: url is required
navigate

# ✅ Correct
navigate url=https://example.com
```

**Invalid command:**
```oxtest
# ❌ Error: Unknown command
clickButton css=.btn

# ✅ Correct
click css=.btn
```

**Malformed parameter:**
```oxtest
# ❌ Error: Missing value
fill css=#email value=

# ✅ Correct
fill css=#email value=user@test.com
```

**Unquoted spaces:**
```oxtest
# ❌ Error: Space in unquoted value
assertText css=h1 text=Welcome User

# ✅ Correct
assertText css=h1 text="Welcome User"
```

---

## Converting to Playwright

OXTest commands map directly to Playwright:

```oxtest
navigate url=https://example.com
```
↓
```typescript
await page.goto('https://example.com');
```

```oxtest
click css=button.submit
```
↓
```typescript
await page.click('button.submit');
```

```oxtest
fill css=#email value=user@test.com
```
↓
```typescript
await page.fill('#email', 'user@test.com');
```

```oxtest
assertVisible css=.dashboard
```
↓
```typescript
await expect(page.locator('.dashboard')).toBeVisible();
```

---

## Related Documentation

- [YAML Syntax Reference](./YAML-SYNTAX.md)
- [API Documentation](./API.md)
- [Getting Started Guide](./e2e-tester-agent/GETTING_STARTED.md)
- [Examples Directory](../demo/)

---

## Quick Reference Card

```oxtest
# Navigation
navigate url=<url>
goBack
goForward
reload

# Interaction
click <selector>
fill <selector> value=<text>
type <selector> value=<text>
press key=<keyName>
check <selector>
uncheck <selector>
selectOption <selector> value=<option>
hover <selector>

# Assertions
assertVisible <selector>
assertHidden <selector>
assertText <selector> text=<expected>
assertValue <selector> value=<expected>
assertEnabled <selector>
assertDisabled <selector>
assertChecked <selector>
assertUnchecked <selector>
assertUrl pattern=<pattern>
assertTitle text=<title>

# Utility
wait duration=<ms>
waitForSelector <selector>
screenshot [path=<filename>]
setViewport width=<w> height=<h>

# Selectors
css=<selector>
text=<content>
xpath=<xpath>
testid=<id>
role=<role>
placeholder=<text>
```

---

**Happy Testing!** 🚀
