import { expect, test } from '@playwright/test';

test('home → lesson → TRY IT → kill a server: errors rise, then return to 0', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page
    .getByRole('link', { name: /Load balancing/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/lesson\/load-balancing\/1$/);
  await expect(page.getByRole('heading', { name: 'One server, too many shoppers' })).toBeVisible();

  // Step forward with the keyboard until the TRY IT step.
  for (let step = 2; step <= 5; step++) {
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(new RegExp(`/lesson/load-balancing/${step}$`));
  }
  await expect(page).toHaveURL(/\/lesson\/load-balancing\/5$/);
  await expect(page.getByRole('heading', { name: 'Pull the plug on Server B' })).toBeVisible();

  const errorRate = page.locator('[data-metric="err"] dd');
  await expect(errorRate).toHaveText('0%');

  await page.getByRole('button', { name: 'Kill a server' }).click();
  await expect
    .poll(async () => parseFloat((await errorRate.textContent()) ?? '0'), { timeout: 2000 })
    .toBeGreaterThan(20);
  await expect(page.locator('[data-metric="healthy"] dd')).toHaveText('2/3');

  // The health check removes Server B after ~3 s and errors drop back to zero.
  await expect(errorRate).toHaveText('0%', { timeout: 8000 });
});

test('progress is remembered on the home page', async ({ page }) => {
  await page.goto('/lesson/caching/3');
  await expect(page.getByRole('heading', { name: 'Check the cache first' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Continue where you left off/ })).toContainText(
    'Caching',
  );
});

test('⌘K search jumps to a step', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Search lessons' }).fill('stampede');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/lesson\/caching\/8$/);
});
