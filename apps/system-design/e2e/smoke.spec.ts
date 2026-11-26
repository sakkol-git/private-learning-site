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

test('a new lesson opens directly at a middle step and its scenario runs', async ({ page }) => {
  await page.goto('/lesson/sharding/5');
  await expect(page.getByRole('heading', { name: 'The star posts something big' })).toBeVisible();
  const errorRate = page.locator('[data-metric="err"] dd');
  await expect(errorRate).toHaveText('0%');
  await page.getByRole('button', { name: 'One client floods', exact: true }).click();
  await expect
    .poll(async () => parseFloat((await errorRate.textContent()) ?? '0'), { timeout: 3000 })
    .toBeCloseTo(12.8, 0);

  // Resume from home.
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Continue where you left off/ })).toContainText(
    'Sharding',
  );
});

test('killing the primary database fails writes until a replica is promoted', async ({ page }) => {
  await page.goto('/lesson/database-replication/8');
  await expect(page.getByRole('heading', { name: 'The primary goes down' })).toBeVisible();
  const errorRate = page.locator('[data-metric="err"] dd');
  await page.getByRole('button', { name: 'Kill the primary database', exact: true }).click();
  await expect(errorRate).toHaveText('14%', { timeout: 2000 });
  await expect(errorRate).toHaveText('0%', { timeout: 8000 });
});

test('a queue keeps checkout up when every worker stops', async ({ page }) => {
  await page.goto('/lesson/message-queues/5');
  await expect(page.getByRole('heading', { name: 'Stop every worker' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop the workers', exact: true }).click();
  // The backlog grows while errors stay at zero.
  await expect(page.locator('svg[role="img"]')).toContainText('1,500', { timeout: 8000 });
  await expect(page.locator('[data-metric="err"] dd')).toHaveText('0%');
});

test('⌘K search finds a new lesson', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Search lessons' }).fill('virtual nodes');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/lesson\/consistent-hashing\/7$/);
});

test('⌘K search jumps to a step', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Search lessons' }).fill('stampede');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/lesson\/caching\/8$/);
});
