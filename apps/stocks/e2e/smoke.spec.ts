import { expect, test, type Page } from '@playwright/test';

const tile = (page: Page, key: string) => page.locator(`[data-metric="${key}"] dd`);
const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

test('home → one stock vs index: a collapse wipes out the stock, not the index', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Own a slice of a company');
  await page
    .getByRole('link', { name: /One stock vs the whole index/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'An index is a basket of companies' }),
  ).toBeVisible();
  await expect(page.getByText(/Companies and prices are fictional/)).toBeVisible();

  for (let step = 2; step <= 3; step++) {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(new RegExp(`/lesson/one-stock-vs-index/${step}$`));
  }
  await press(page, 'Company collapses');
  await expect(tile(page, 'value')).toHaveText('$1,577', { timeout: 5000 });
  await expect(page.locator('[data-metric="return"]')).toHaveAttribute('data-status', 'fail');

  await page.goto('/lesson/one-stock-vs-index/5');
  await press(page, 'Company collapses');
  await expect(tile(page, 'value')).toHaveText('$9,936', { timeout: 5000 });
});

test('an earnings gap skips the stop and costs more than planned', async ({ page }) => {
  await page.goto('/lesson/earnings-day/4');
  await expect(tile(page, 'value')).toHaveText('$9,994');
  await press(page, 'Earnings surprise');
  await expect(tile(page, 'value')).toHaveText('$9,744', { timeout: 5000 });
  await expect(page.locator('.cs-exit text')).toHaveText('Stopped out −$256');
});

test('a short squeeze ends in a margin call', async ({ page }) => {
  await page.goto('/lesson/margin-and-shorting/5');
  await press(page, 'Short squeeze');
  await expect(tile(page, 'value')).toHaveText('$4,089', { timeout: 5000 });
  await expect(page.locator('.cs-exit text')).toHaveText('Margin call −$5,911');
});
