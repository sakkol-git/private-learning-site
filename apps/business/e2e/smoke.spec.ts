import { expect, test, type Page } from '@playwright/test';

const tile = (page: Page, key: string) => page.locator(`[data-metric="${key}"] dd`);
const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

test('home → safety stock: lean stock runs out, a buffer does not', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('make a supplier late');
  await page
    .getByRole('link', { name: /Safety stock/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Running lean' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/lesson\/safety-stock\/2$/);
  await press(page, 'Supplier is late');
  await expect(tile(page, 'filled')).toHaveText('0%', { timeout: 4000 });
  await expect(tile(page, 'cash')).toHaveText('$37,500', { timeout: 8000 });

  await page.goto('/lesson/safety-stock/4');
  await press(page, 'Supplier is late');
  await expect(tile(page, 'stock')).toHaveText('20units', { timeout: 9000 });
  await expect(tile(page, 'filled')).toHaveText('100%');
});

test('a second supplier keeps every order filled', async ({ page }) => {
  await page.goto('/lesson/two-suppliers/4');
  await press(page, 'Supplier is late');
  await page.waitForTimeout(4000);
  await expect(tile(page, 'filled')).toHaveText('100%');
  await expect(tile(page, 'stock')).toHaveText('60units');
});

test('late payments push cash below zero without a buffer', async ({ page }) => {
  await page.goto('/lesson/cash-flow/2');
  await press(page, 'Customers pay late');
  await expect(tile(page, 'cash')).toHaveText('−$8,000', { timeout: 8000 });
  await expect(page.locator('[data-metric="cash"]')).toHaveAttribute('data-status', 'fail');
});
