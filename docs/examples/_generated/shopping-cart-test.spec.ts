import { test, expect } from '@playwright/test';

test('shopping-cart-test', async ({ page }) => {
  // Start at the base URL
  await page.goto('https://osc2.oxid.shop');

  // Step 1: Verify homepage loads correctly
  await expect(page).toHaveURL('https://osc2.oxid.shop/');
  await expect(page.locator('.logo')).toBeVisible();
  await expect(page).toHaveTitle(/OXID eShop/);

  // Step 2: Add two different products to cart from homepage
  const productLinks = await page.locator('.productBox:has(.add-to-cart-btn)').all();
  await expect(productLinks.length).toBeGreaterThan(1);

  // Add first product
  await productLinks[0].locator('.add-to-cart-btn').click();
  await expect(page.locator('.mini-cart-badge')).toHaveText('1');

  // Add second product
  await productLinks[1].locator('.add-to-cart-btn').click();
  await expect(page.locator('.mini-cart-badge')).toHaveText('2');

  // Step 3: Navigate to category and add one more product
  const categoryLinks = await page.locator('.category-nav a').all();
  await expect(categoryLinks.length).toBeGreaterThan(0);
  
  await categoryLinks[0].click();
  await expect(page.locator('.category-title')).toBeVisible();

  const categoryProducts = await page.locator('.productBox:has(.add-to-cart-btn)').all();
  await expect(categoryProducts.length).toBeGreaterThan(0);

  await categoryProducts[0].locator('.add-to-cart-btn').click();
  await expect(page.locator('.mini-cart-badge')).toHaveText('3');

  // Step 4: View cart and verify contents
  await page.locator('.mini-cart-icon').click();
  await page.locator('a:has-text("View Cart")').click();
  
  await expect(page).toHaveURL(/.*basket/);
  await expect(page.locator('.basket-items')).toHaveCount(3);
  
  const productNames = page.locator('.basket-item .product-title');
  const productPrices = page.locator('.basket-item .product-price');
  
  await expect(productNames).toHaveCount(3);
  await expect(productPrices).toHaveCount(3);
  
  for (let i = 0; i < 3; i++) {
    await expect(productNames.nth(i)).toBeVisible();
    await expect(productPrices.nth(i)).toBeVisible();
  }
  
  await expect(page.locator('.checkout-btn')).toBeVisible();
  await expect(page.locator('.basket-total')).toContainText('3');
});