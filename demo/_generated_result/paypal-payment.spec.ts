import { test, expect } from '@playwright/test';

test('paypal-payment-test', async ({ page }) => {
  await page.goto('https://osc2.oxid.shop');

  // Step 1: user-login
  await page.click('.service-menu.showLogin');
  await page.fill('input[name="lgn_usr"]', 'redrobot@dantweb.dev');
  await page.fill('input[name="lgn_pwd"]', 'useruser');
  await page.click('button:has-text("Login")');
  
  // Verify login success
  await expect(page.locator('.service-menu.showLogin')).toBeVisible();
  await expect(page.locator('.service-menu:has-text("My Account")')).toBeVisible();

  // Step 2: add-products-to-cart
  // Add first product
  await page.locator('.productData .btn-default[type="submit"]').first().click();
  await expect(page.locator('.modal-dialog')).toBeVisible();
  await page.locator('.modal-dialog .modal-header .close').click();
  
  // Add second product
  await page.locator('.productData:nth-of-type(2) .btn-default[type="submit"]').click();
  await expect(page.locator('.modal-dialog')).toBeVisible();
  await page.locator('.modal-dialog .modal-header .close').click();
  
  // Verify cart has 2 items
  await expect(page.locator('.minibasket-menu .badge')).toHaveText('2');

  // Step 3: open-cart-and-checkout
  await page.locator('.btn-group.minibasket-menu button').click();
  await expect(page.locator('.minibasket-menu-box')).toBeVisible();
  await page.locator('.minibasket-menu-box .btn.btn-primary').click();
  
  // Verify checkout page loads
  await expect(page.locator('h1:has-text("Payment")')).toBeVisible();

  // Step 4: select-paypal-payment
  await page.locator('input[type="radio"][value="oscpaypal"]').click();
  await expect(page.locator('input[type="radio"][value="oscpaypal"]')).toBeChecked();
  await page.locator('button:has-text("Next")').click();
  
  // Verify order summary page
  await expect(page.locator('h1:has-text("Order summary")')).toBeVisible();

  // Step 5: accept-terms-and-order
  await page.locator('input[name="ord_agb"]').check();
  await expect(page.locator('input[name="ord_agb"]')).toBeChecked();
  await page.locator('button:has-text("Order now")').click();

  // Step 6: verify-paypal-iframe
  const paypalIframe = page.frameLocator('iframe[title="PayPal"], iframe[src*="paypal"]').first();
  await expect(paypalIframe.locator('[data-testid="smart-payment-button"]')).toBeVisible({ timeout: 10000 });
  
  // Click PayPal button in iframe
  await paypalIframe.locator('[data-testid="smart-payment-button"]').click();

  // Step 7: handle-paypal-popup
  const popupPromise = page.waitForEvent('popup');
  const popup = await popupPromise;
  await popup.waitForLoadState();
  
  // Wait for PayPal login page and verify it opens
  await expect(popup.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  
  // Note: Actual PayPal login requires test credentials and may need manual intervention
  // For automated testing, you would need PayPal sandbox test credentials
  console.log('PayPal popup opened - manual login required or use test credentials');

  // Step 8: verify-order-confirmation
  // After PayPal authorization, wait for redirect back to shop
  await page.waitForURL('**/thankyou', { timeout: 30000 });
  
  // Verify thank you page
  await expect(page.locator('h1:has-text("Thank you")')).toBeVisible();
  await expect(page.locator('.alert-success:has-text("order has been completed")')).toBeVisible();
  
  // Capture screenshot for verification
  await page.screenshot({ path: 'order-confirmation.png', fullPage: true });
});