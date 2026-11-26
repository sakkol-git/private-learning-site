import { expect, test, type Page } from '@playwright/test';

const tile = (page: Page, key: string) => page.locator(`[data-metric="${key}"] dd`);
const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

test('home → packets: a router fails, then traffic routes around it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Follow your data');
  await page
    .getByRole('link', { name: /Packets and routes/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'There is no wire straight to the shop' }),
  ).toBeVisible();
  for (let step = 2; step <= 4; step++) {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(new RegExp(`/lesson/packets-and-routes/${step}$`));
  }
  await press(page, 'A router fails');
  await expect(tile(page, 'ok')).toHaveText('0%', { timeout: 2000 });
  await expect(tile(page, 'ok')).toHaveText('100%', { timeout: 6000 });
  await expect(tile(page, 'hops')).toHaveText('5');
});

test('a DNS outage breaks only uncached lookups', async ({ page }) => {
  await page.goto('/lesson/finding-addresses/5');
  await press(page, 'DNS goes down');
  await expect(tile(page, 'ok')).toHaveText('83.3%', { timeout: 3000 });
});

test('a flood takes the site down until scrubbing filters it', async ({ page }) => {
  await page.goto('/lesson/denial-of-service/2');
  await press(page, 'DDoS attack');
  await expect(tile(page, 'ok')).toHaveText('9.5%', { timeout: 3000 });
  await page.goto('/lesson/denial-of-service/5');
  await press(page, 'DDoS attack');
  await page.waitForTimeout(1500);
  await expect(tile(page, 'ok')).toHaveText('100%');
});
