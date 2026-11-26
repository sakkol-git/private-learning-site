import { expect, test, type Page } from '@playwright/test';

const tile = (page: Page, key: string) => page.locator(`[data-metric="${key}"] dd`);
const dollars = (text: string | null) =>
  Number((text ?? '').replace(/[^0-9.]/g, '')) * (text?.startsWith('−') ? -1 : 1);

test('home → safety net → lose your income with no savings: debt appears', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('test it against life');
  await page
    .getByRole('link', { name: /Building a safety net/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Everything works/ })).toBeVisible();
  await expect(page.getByText('For learning only, not financial advice.')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/lesson\/safety-net\/2$/);
  await expect(tile(page, 'debt')).toHaveText('$0');

  await page.getByRole('button', { name: 'Lose your income', exact: true }).click();
  await expect(tile(page, 'income')).toHaveText('$0');
  await expect(tile(page, 'saved')).toHaveText('−$1,700');
  await expect
    .poll(async () => dollars(await tile(page, 'debt').textContent()), { timeout: 4000 })
    .toBeGreaterThan(1000);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(tile(page, 'debt')).toHaveText('$0');
});

test('a full emergency fund absorbs a surprise bill', async ({ page }) => {
  await page.goto('/lesson/safety-net/5');
  await page.getByRole('button', { name: 'Surprise bill', exact: true }).click();
  await expect(tile(page, 'netWorth')).toHaveText('$2,500', { timeout: 3000 });
  await expect(tile(page, 'debt')).toHaveText('$0');
});

test('when new money stops, the scheme collapses and takes your stake', async ({ page }) => {
  await page.goto('/lesson/spotting-a-scheme/5');
  await expect(page.getByRole('heading', { name: 'New money stops' })).toBeVisible();
  await expect(tile(page, 'netWorth')).toHaveText('$6,000');
  await page.getByRole('button', { name: 'New money stops', exact: true }).click();
  await expect(tile(page, 'netWorth')).toHaveText('$4,000', { timeout: 5000 });
});

test('the fourth month without income crosses from savings into debt', async ({ page }) => {
  await page.goto('/lesson/safety-net/5');
  const comparison = page
    .locator('figure')
    .filter({ hasText: 'When does the emergency fund run out?' });
  await expect(comparison.locator('dd')).toHaveText(['5,100 USD', '0 USD']);
  await comparison.getByRole('combobox').selectOption({ label: 'Month 4' });
  await expect(comparison.locator('dd')).toHaveText(['0 USD', '1,700 USD']);
});

test('a comparison link restores the shared month after a reload', async ({ page }) => {
  await page.goto('/lesson/safety-net/5?frame=5#experiment');
  const month = page.getByRole('combobox', { name: 'Time without income' });
  await expect(month).toHaveValue('4');
  await month.selectOption({ label: 'Month 2' });
  await page.reload();
  await expect(month).toHaveValue('2');
  await expect(page.locator('figure dd')).toHaveText(['1,700 USD', '0 USD']);
});
