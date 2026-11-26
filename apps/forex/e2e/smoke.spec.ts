import { expect, test, type Page } from '@playwright/test';

const tile = (page: Page, key: string) => page.locator(`[data-metric="${key}"] dd`);

test('home → leverage lesson → price moves against you: margin call', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('stress-test it');
  await page
    .getByRole('link', { name: /Leverage and margin calls/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'A small deposit, a large position' }),
  ).toBeVisible();
  await expect(page.getByText(/most retail traders lose/)).toBeVisible();

  for (let step = 2; step <= 4; step++) {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(new RegExp(`/lesson/leverage-and-margin/${step}$`));
  }
  await expect(tile(page, 'balance')).toHaveText('$1,000');
  await expect(tile(page, 'marginLevel')).toHaveText('111%');

  await page.getByRole('button', { name: 'Price moves against you', exact: true }).click();
  await expect(tile(page, 'balance')).toHaveText('$434', { timeout: 5000 });
  await expect(page.locator('.cs-exit text')).toHaveText('Margin call −$566');
  await expect(page.locator('[data-metric="drawdown"]')).toHaveAttribute('data-status', 'fail');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(tile(page, 'balance')).toHaveText('$1,000');
});

test('a planned trade reaches its target on its own', async ({ page }) => {
  await page.goto('/lesson/stop-loss/4');
  await expect(page.getByRole('heading', { name: 'Let the plan work' })).toBeVisible();
  await expect(tile(page, 'balance')).toHaveText('$10,600', { timeout: 5000 });
  await expect(page.locator('.cs-exit text')).toHaveText('Target hit +$600');
});

test('a spread spike alone stops out a tight stop', async ({ page }) => {
  await page.goto('/lesson/spread-and-costs/4');
  await expect(tile(page, 'openPnl')).toHaveText('−$12');
  await page.getByRole('button', { name: 'Spread widens', exact: true }).click();
  await expect(tile(page, 'balance')).toHaveText('$9,934', { timeout: 5000 });
});
