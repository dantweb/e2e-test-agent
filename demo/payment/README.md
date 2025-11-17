# Shopping and Payment Demo

Complete end-to-end tests demonstrating the full customer journey on OXID eShop.

## Test Files

### 1. `shopping-payment.yaml`
**Type**: Complete Shopping Flow
**Website**: https://osc2.oxid.shop
**Test User**: redrobot@dantweb.dev / useruser
**Payment**: Standard checkout (Cash on Delivery, Invoice)

### 2. `paypal_payment.yaml`
**Type**: PayPal Integration Test
**Website**: https://osc2.oxid.shop
**Test User**: redrobot@dantweb.dev / useruser
**Payment**: PayPal (with popup handling)
**Based On**: `/home/dtkachev/osc/strpwt7-oct21/paypal-module-6.3/tests/e2e/playwright/tests/e2e/PaypalPayment.spec.js`

---

## Test Overview - Shopping Payment

## Test Flow

This comprehensive test covers the entire shopping experience:

### 1. 🔐 User Authentication
- Opens login form
- Enters credentials
- Verifies successful login

### 2. 🛍️ Product Browsing & Selection
- Navigates product catalog
- Adds multiple products to cart
- Handles add-to-cart confirmation modals

### 3. 🛒 Shopping Cart Review
- Opens mini basket
- Reviews cart contents
- Proceeds to checkout

### 4. 📦 Shipping Address
- Verifies/fills shipping information
- Ensures all required fields are completed

### 5. 💳 Payment Method Selection
- Selects payment method (Cash on Delivery, Invoice, or PayPal)
- Proceeds to order summary

### 6. 📋 Order Summary
- Reviews order details
- Accepts Terms & Conditions
- Places the order

### 7. ✅ Order Confirmation
- Verifies thank you page
- Confirms order number display
- Captures screenshot for records

## Running the Test

### Using E2E Test Agent

```bash
# Generate Playwright test from YAML
e2e-agent generate \
  --src demo/payment/shopping-payment.yaml \
  --output demo/payment/_generated

# Execute generated test
npm run test:generated
```

### Direct Execution

```bash
# Navigate to project root
cd /home/dtkachev/osc/strpwt7-oct21/e2e-agent

# Run the test
node dist/cli.js generate \
  --src demo/payment/shopping-payment.yaml \
  --output demo/payment/_generated \
  --execute
```

## Configuration

### Environment Variables

The test uses these environment variables (defined in the YAML):

```yaml
env:
  BASE_URL: https://osc2.oxid.shop
  USER_EMAIL: redrobot@dantweb.dev
  USER_PASSWORD: useruser
```

### Test Credentials

- **Email**: redrobot@dantweb.dev
- **Password**: useruser
- **Shop**: OXID eShop Community Edition

## Features Demonstrated

### ✨ Advanced Test Patterns

1. **Error Handling**
   - Fallback selectors for resilience
   - `continue_on_failure` for optional steps
   - Alternative payment method handling

2. **State Management**
   - Checks if user is already logged in
   - Handles dynamic modals
   - Waits for asynchronous operations

3. **Validation**
   - Assertion at key checkpoints
   - URL pattern verification
   - Element existence checks

4. **Dependencies**
   - Tasks execute in proper order
   - `depends_on` ensures prerequisites

5. **Screenshot Capture**
   - Documents successful order completion

## Selectors Used

### Modern Best Practices

- **Semantic CSS**: `.service-menu`, `.btn-minibasket`
- **Form IDs**: `#loginEmail`, `#loginPasword`
- **Button Text**: `:has-text("Order now")`
- **Fallback Strategies**: Multiple selector options

## Expected Results

### Successful Test Run

```
✅ Task 1: User Login - PASSED
✅ Task 2: Add Products to Cart - PASSED
✅ Task 3: View Shopping Cart - PASSED
✅ Task 4: Checkout Shipping - PASSED
✅ Task 5: Select Payment - PASSED
✅ Task 6: Order Summary - PASSED
✅ Task 7: Order Confirmation - PASSED

📸 Screenshot saved: order-confirmation.png
⏱️  Total Duration: ~120 seconds
```

## Troubleshooting

### Common Issues

1. **Login Fails**
   - Verify credentials are correct
   - Check if user account exists
   - Ensure BASE_URL is accessible

2. **Products Not Added**
   - Product availability may vary
   - Try adjusting selectors
   - Check if modal close works

3. **Payment Selection Fails**
   - Payment methods vary by shop configuration
   - Test tries multiple options (COD, Invoice, PayPal)
   - Verify at least one is enabled

4. **Order Not Placed**
   - Ensure Terms & Conditions checkbox works
   - Check order button selector
   - Verify cart has items

## Customization

### Changing Test User

Edit the `env` section:

```yaml
env:
  USER_EMAIL: your-email@example.com
  USER_PASSWORD: your-password
```

### Adding More Products

Duplicate the product addition steps:

```yaml
- click css=.productData:nth-of-type(3) .btn-default[type="submit"]
  description: Add third product to cart
```

### Using Different Payment Methods

Modify payment selection:

```yaml
# For credit card
- click css=#payment_oxidcreditcard
  description: Select credit card payment

# For bank transfer
- click css=#payment_oxiddebitnote
  description: Select bank transfer
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Shopping Payment Test
  env:
    BASE_URL: ${{ secrets.SHOP_URL }}
    USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: |
    npm run generate -- \
      --src demo/payment/shopping-payment.yaml \
      --output _generated \
      --execute
```

## Related Files

- `shopping-payment.yaml` - Test specification
- `_generated/shopping-payment.spec.ts` - Generated Playwright test (after running)
- `order-confirmation.png` - Screenshot (after successful run)

## Inspiration

This test was inspired by payment integration tests from:
- PayPal OXID Module E2E tests
- Real-world e-commerce testing patterns
- Best practices for stable, maintainable tests

## Notes

- Test duration: ~2 minutes
- Browser: Chromium (default)
- Viewport: 1920x1080
- Headless: Configurable

## Support

For issues or questions:
1. Check test logs for detailed error messages
2. Verify selectors match current shop version
3. Ensure test user has proper permissions
4. Review OXID shop configuration

---

## PayPal Payment Test (`paypal_payment.yaml`)

### Overview

This test replicates the PayPal payment flow from the PayPal module E2E tests. It demonstrates a complete PayPal integration test including iframe interaction and popup handling.

### Test Flow (8 Tasks)

1. **User Login** - Authenticate with shop credentials
2. **Add to Cart** - Add products to shopping cart
3. **Checkout** - Open cart and proceed to payment
4. **Select PayPal** - Choose PayPal as payment method
5. **Accept Terms & Order** - Accept T&C and place order
6. **PayPal Iframe** - Detect PayPal button in iframe
7. **PayPal Login** - Handle PayPal popup (manual/automated)
8. **Verify Confirmation** - Confirm successful payment

### Source Mapping

Based on `PaypalPayment.spec.js`, the YAML maps these helper methods:

| Helper Method | YAML Tasks |
|---------------|------------|
| `shopHelper.loginUser()` | Task 1 (user-login) |
| `shopHelper.addItemsToCart()` | Task 2 (add-to-cart) |
| `shopHelper.checkout()` | Task 3 (checkout) |
| `shopHelper.selectPaymentMethod('PayPal')` | Task 4 (select-paypal) |
| `shopHelper.nextStep()` | Task 4 (select-paypal) |
| `shopHelper.acceptTerms()` | Task 5 (accept-terms-order) |
| `shopHelper.orderNow()` | Task 5 (accept-terms-order) |
| `paypalHelper.clickPaypalButtonInIframe('Paypal')` | Task 6 (paypal-iframe) |
| `paypalHelper.handlePopup()` | Task 7 (paypal-login) |
| `paypalHelper.verifyThankYouPage()` | Task 8 (verify-thankyou) |

### Special Requirements

#### Environment Variables

```bash
export PAYPAL_EMAIL="your-sandbox-email@example.com"
export PAYPAL_PASSWORD="your-sandbox-password"
```

#### Known Limitations

**⚠️ Manual Steps Required:**

1. **Iframe Interaction (Task 6)**
   - Clicking button inside PayPal iframe requires special handling
   - Standard YAML `click` commands don't work inside iframes
   - Requires custom JavaScript execution or Playwright frameLocator

2. **Popup Handling (Task 7)**
   - PayPal opens in new browser window/popup
   - Requires context switching to popup window
   - Login form interaction in separate context
   - Waiting for popup to close

#### Workarounds

**Option 1: Manual Execution**
- Run test until Task 6
- Manually click PayPal button
- Manually complete PayPal login
- Test verifies final state

**Option 2: Custom Extension**
Extend the e2e-agent to support:

```yaml
# Future syntax for iframe handling
- click_iframe css=iframe[title="PayPal"] selector=button[data-funding-source="paypal"]
  description: Click PayPal button inside iframe

# Future syntax for popup handling
- handle_popup:
    trigger: previous_click
    actions:
      - fill css=#email value=${PAYPAL_EMAIL}
      - click css=#btnNext
      - fill css=#password value=${PAYPAL_PASSWORD}
      - click css=#btnLogin
      - click css=button:has-text("Continue")
```

### Dependencies Learned from Original Test

From `PaypalPayment.spec.js`:

```javascript
// Setup
context = await browser.newContext({
    extraHTTPHeaders: {
        'ngrok-skip-browser-warning': 'true',
    },
});
page.setDefaultTimeout(45000);  // Increased timeout for PayPal
page.setDefaultNavigationTimeout(45000);
```

**YAML Equivalent:**
- Task waits adjusted to 20-30 seconds for PayPal iframe loading
- Fallback selectors for robustness
- `continue_on_failure` for optional modals

### Key Selectors from ShopHelper

```typescript
// Login
.service-menu.showLogin              // User menu trigger
form[name="login"] #loginEmail       // Email field
form[name="login"] #loginPasword     // Password field (note typo!)
div.menu-dropdowns > ul              // User logged in indicator

// Cart & Checkout
.productData .btn-default[type="submit"]  // Add to cart button
.modal-dialog .modal-header .close        // Modal close button
.btn-group.minibasket-menu button         // Cart dropdown
.minibasket-menu-box .btn.btn-primary     // Checkout button

// Payment
input[type="radio"][value="oscpaypal"]    // PayPal radio button
button:has-text("Next")                   // Next step button
#checkAgbTop                              // Terms checkbox
button:has-text("Order now")              // Order button

// PayPal
iframe[title="PayPal"]                    // PayPal iframe
#thankyouPage                            // Confirmation page
```

### Key Selectors from PaypalHelper

```typescript
// PayPal Iframe Detection
'iframe[title="PayPal"]'
'iframe[title*="PayPal"]'
'.component-frame.visible'
'iframe[src*="paypal"]'

// PayPal Popup Login
'#email'           // Email field
'#password'        // Password field
'#btnNext'         // Next button (after email)
'#btnLogin'        // Login button
'button:has-text("Continue")'  // Continue button
'[data-testid="submit-button-initial"]'  // Submit button

// Thank You Page
'#thankyouPage'
'[data-testid="thank-you"]'
'.thankyou'
```

### Execution Notes

1. **Timeout Strategy**: Original test uses 45-second timeouts
2. **Iframe Index**: PayPal button is in 2nd iframe (`index: 1`)
3. **Popup Detection**: Listens for `popup` event before clicking
4. **Login Flow**: Email → Next → Password → Login → Continue
5. **Confirmation Wait**: Up to 60 seconds for thank you page

### Running the Test

```bash
# Generate test
e2e-agent generate \
  --src demo/payment/paypal_payment.yaml \
  --output demo/payment/_generated

# Note: Will require manual intervention at Tasks 6-7
# Or use custom iframe/popup handling code
```

### Future Enhancements

To make this fully automated, the e2e-agent would need:

1. **Iframe Support**
   ```yaml
   - click_in_frame:
       iframe: css=iframe[title="PayPal"]
       selector: css=button[data-funding-source="paypal"]
   ```

2. **Popup/Window Management**
   ```yaml
   - switch_to_popup:
       timeout: 20000
   - fill css=#email value=${PAYPAL_EMAIL}
   - switch_to_main_window
   ```

3. **Wait for Popup Close**
   ```yaml
   - wait_for_popup_close:
       timeout: 120000
   ```

---

**Happy Testing!** 🎉
