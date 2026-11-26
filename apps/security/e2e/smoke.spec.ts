import { expect, test, type Page } from '@playwright/test';

const tile = (page: Page, key: string) => page.locator(`[data-metric="${key}"] dd`);
const press = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click();

test('home → reused passwords: one leak opens every account', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('lock every door');
  await page
    .getByRole('link', { name: /One password, many doors/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'The same password everywhere' })).toBeVisible();
  for (let step = 2; step <= 3; step++) {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(new RegExp(`/lesson/reused-passwords/${step}$`));
  }
  await press(page, 'A website leaks passwords');
  await expect(tile(page, 'safe')).toHaveText('0/4', { timeout: 4000 });
  await expect(tile(page, 'lost')).toHaveText('$2,400');
});

test('two-factor login keeps the bank safe', async ({ page }) => {
  await page.goto('/lesson/two-factor/3');
  await press(page, 'A website leaks passwords');
  await expect(tile(page, 'safe')).toHaveText('2/4', { timeout: 4000 });
  await expect(tile(page, 'lost')).toHaveText('$0');
});

test('an offline backup recovers from ransomware', async ({ page }) => {
  await page.goto('/lesson/ransomware-and-backups/5');
  await press(page, 'Ransomware strikes');
  await expect(tile(page, 'locked')).toHaveText('100%', { timeout: 2000 });
  await expect(tile(page, 'locked')).toHaveText('0%', { timeout: 6000 });
  await expect(tile(page, 'recovery')).toHaveText('1days');
});
