import { test, expect } from '@playwright/test';

test('paypal-payment-test', async ({ page }) => {
  // Generated from validated OXTest

  // navigate
  await page.goto('https://osc2.oxid.shop');

  // click
  await page.locator('.showLogin').click();

  // wait
  await page.waitForTimeout(0);

  // type
  await page.getByPlaceholder('E-Mail').fill('redrobot@dantweb.dev');

  // type
  await page.locator('input[type=password]').fill('useruser');

  // click
  await page.locator('.service-menu').click();

  // wait
  await page.waitForTimeout(10000);

  // assertVisible
  await expect(page.locator('.service-menu')).toBeVisible();

  // assertUrl
  expect(page.url()).toMatch(/\.\*startseite\.\*/);

  // wait
  await page.waitForTimeout(0);

});