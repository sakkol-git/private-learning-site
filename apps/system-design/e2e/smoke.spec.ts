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

test('experiment keeps the starting values until reset', async ({ page }) => {
  await page.goto('/lesson/load-balancing/5');
  const healthy = page.locator('[data-metric="healthy"]');
  await page.getByRole('button', { name: 'Kill a server', exact: true }).click();
  await expect(healthy.locator('dt')).toContainText('Before 3/3');
  await expect(healthy.locator('dd')).toHaveText('2/3');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(healthy.locator('dt')).not.toContainText('Before');
  await expect(healthy.locator('dd')).toHaveText('3/3');
});

test('chapter navigation jumps to the chosen chapter', async ({ page, isMobile }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Chapters', exact: true });
  if (isMobile) {
    await nav.getByRole('combobox').selectOption('chapter-case-studies');
  } else {
    await nav.getByRole('link', { name: /Case studies/ }).click();
  }
  await expect(page.locator('#chapter-case-studies')).toBeInViewport();
});

test('mobile scene view and step picker', async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto('/lesson/load-balancing/5');
  const region = page.getByRole('region', { name: 'System diagram' });
  await expect(region).toBeVisible();
  const overflow = () => region.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Detail', exact: true }).click();
  expect(await overflow()).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  expect(await overflow()).toBeLessThanOrEqual(1);
  await page.getByRole('combobox', { name: /Step 5 of/ }).selectOption('0');
  await expect(page).toHaveURL(/\/lesson\/load-balancing\/1$/);
});

test('inspect a server and follow a request with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lesson/load-balancing/1');
  const picker = page.getByLabel('Inspect a node or trace a route');
  await picker.selectOption({ label: 'Server A' });
  await expect(page.locator('output')).toContainText('Server A');
  await picker.selectOption({ label: 'request · Shoppers → Server A → Orders DB' });
  await expect(page.locator('[data-traced]')).toHaveCount(2);
  await picker.press('Home');
  await expect(page.locator('[data-traced]')).toHaveCount(0);
});
