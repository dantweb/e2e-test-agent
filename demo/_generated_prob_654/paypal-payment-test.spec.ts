import { test, expect } from '@playwright/test';

test('paypal-payment-test', async ({ page }) => {
  // Generated from validated OXTest

  // navigate
  await page.goto('https://osc2.oxid.shop');

  // click
  await page.getByText('Anmelden').click();

  // type
  await page.getByPlaceholder('E-Mail-Adresse').fill('redrobot@dantweb.dev');

  // type
  await page.getByPlaceholder('Passwort').fill('useruser');

  // click
  await page.getByText('Anmelden').click();

  // navigate
  await page.goto('https://osc2.oxid.shop/index.php?cl=alist');

  // navigate
  await page.goto('https://osc2.oxid.shop/index.php?cl=payment');

  // click
  await page.getByText('Click').click();

  // navigate
  await page.goto('https://osc2.oxid.shop/warenkorb/');

  // waitForSelector
  await page.locator('iframe[title=PayPal],').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('iframe[title=PayPal],').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('xpath=//iframe[@title=PayPal').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('xpath=//iframe[@title=PayPal]').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('xpath=//iframe[@title=PayPal').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('iframe[src*=paypal]').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('iframe[src*=paypal]').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('xpath=//iframe[@title=PayPal').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('iframe[title=PayPal]').waitFor({ state: 'visible' });

  // waitForSelector
  await page.locator('iframe[title=PayPal]').waitFor({ state: 'visible' });

  // click
  await page.getByText('Mit').click();

  // waitForSelector
  await page.locator('input[type=email]').waitFor({ state: 'visible' });

  // type
  await page.locator('input[type=email]').fill('paypal-buyer@unzer.com');

  // type
  await page.locator('input[type=password]').fill('unzer1234');

  // click
  await page.getByText('Log').click();

  // wait
  await page.waitForTimeout(15000);

});