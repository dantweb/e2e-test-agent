# Shopping and Payment Demo

Complete end-to-end test demonstrating the full customer journey on OXID eShop.

## Test Overview

**Test File**: `shopping-payment.yaml`
**Website**: https://osc2.oxid.shop
**Test User**: redrobot@dantweb.dev / useruser

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

**Happy Testing!** 🎉
