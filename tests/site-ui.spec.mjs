import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'home', path: '/' },
  { name: 'journey', path: '/journey' },
  { name: 'creations', path: '/creations' },
  { name: 'odyssey', path: '/odyssey' },
  { name: 'connect', path: '/connect' },
  { name: '404', path: '/404.html' },
  { name: '500', path: '/500.html' }
];
const canonicalPages = pages.filter((page) => !['404', '500'].includes(page.name));
const viewports = [
  { name: 'mobile-portrait', width: 390, height: 844 },
  { name: 'mobile-landscape', width: 568, height: 320 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'short-desktop', width: 720, height: 450 }
];
const webkitViewports = new Set(['mobile-portrait', 'desktop']);

async function preparePage(page, route, viewport) {
  const runtimeErrors = [];
  const failedLocalResponses = [];

  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4176' && response.status() >= 400) {
      failedLocalResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.addInitScript(() => {
    Math.random = () => 0.42;
  });
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);

  const loader = page.locator('#siteLoader');
  if (await loader.count()) {
    await loader.waitFor({ state: 'hidden', timeout: 7000 });
  }
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#mainNav')).toBeVisible();
  await page.waitForTimeout(100);

  return { runtimeErrors, failedLocalResponses };
}

for (const route of pages) {
  for (const viewport of viewports) {
    test(`@layout ${route.name} at ${viewport.name}`, async ({ page, browserName }) => {
      test.skip(browserName === 'webkit' && !webkitViewports.has(viewport.name), 'WebKit uses the representative Safari viewports.');
      const diagnostics = await preparePage(page, route, viewport);

      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const loader = document.getElementById('siteLoader');
        const nav = document.getElementById('mainNav');
        const heading = document.querySelector('h1');
        const navRect = nav.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const hitAt = (rect) => document.elementFromPoint(
          Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2)),
          Math.min(innerHeight - 1, Math.max(0, rect.top + Math.min(rect.height / 2, 24)))
        );
        const navHit = hitAt(navRect);
        const headingHit = hitAt(headingRect);

        return {
          overflow: root.scrollWidth - root.clientWidth,
          loaderVisible: Boolean(loader && getComputedStyle(loader).display !== 'none' && getComputedStyle(loader).visibility !== 'hidden'),
          navHit: Boolean(navHit && (navHit === nav || nav.contains(navHit))),
          headingHit: Boolean(headingHit && (headingHit === heading || heading.contains(headingHit)))
        };
      });

      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.loaderVisible).toBe(false);
      expect(geometry.navHit).toBe(true);
      expect(geometry.headingHit).toBe(true);
      for (const frame of await page.locator('iframe').all()) {
        await expect(frame).toHaveAttribute('title', /\S+/);
      }
      expect(diagnostics.failedLocalResponses).toEqual([]);
      expect(diagnostics.runtimeErrors).toEqual([]);
    });
  }
}

for (const route of pages) {
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 }
  ]) {
    test(`@a11y ${route.name} at ${viewport.name}`, async ({ page }) => {
      await preparePage(page, route, viewport);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('iframe')
        .analyze();
      const blockingViolations = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical'
      );
      expect(blockingViolations, JSON.stringify(blockingViolations, null, 2)).toEqual([]);
    });
  }
}

for (const route of pages) {
  test(`@keyboard ${route.name} skip link and mobile menu`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'The representative WebKit layout and axe suites cover Safari.');
    await preparePage(page, route, { width: 390, height: 844 });

    const firstFocusableIsSkipLink = await page.evaluate(() => {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return document.querySelector(selector)?.classList.contains('skip-link') === true;
    });
    expect(firstFocusableIsSkipLink).toBe(true);

    const skipLink = page.locator('.skip-link');
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect.poll(
      () => skipLink.evaluate((element) => element.getBoundingClientRect().top)
    ).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page).toHaveURL(/#main-content$/);

    const menuButton = page.locator('#hamburger');
    await menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#navLinks')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toBeFocused();
  });
}

for (const route of pages) {
  test(`@nojs ${route.name} remains usable`, async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit', 'No-JS resilience is browser-independent.');
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:4176',
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('#siteLoader')).toBeHidden();
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).not.toBe('hidden');
    const firstNavLink = page.locator('#navLinks a').first();
    await expect(firstNavLink).toBeVisible();
    await firstNavLink.focus();
    await expect(firstNavLink).toBeFocused();
    await context.close();
  });
}

for (const route of canonicalPages) {
  test(`@signature ${route.name} stays in the hero safe zone`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Signature geometry is covered by the representative WebKit layout suite.');
    await preparePage(page, route, { width: 1440, height: 900 });
    const signature = page.locator('.hero-signature-logo');
    await expect(signature).toBeVisible();

    const initialState = await signature.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const protectedElements = [
        document.getElementById('mainNav'),
        document.querySelector('.hero-content, .page-hero-content')
      ].filter(Boolean);
      const overlaps = (first, second) =>
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;
      return {
        overlapsProtectedUi: protectedElements.some((protectedElement) => overlaps(rect, protectedElement.getBoundingClientRect())),
        opacity: Number(getComputedStyle(element).opacity)
      };
    });
    expect(initialState.overlapsProtectedUi).toBe(false);
    expect(initialState.opacity).toBeGreaterThan(0);

    await page.evaluate(() => {
      scrollTo(0, Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    });
    await expect(signature).toHaveClass(/is-outside-hero/);
    await expect(signature).toBeHidden();
  });
}

test('@progressive mobile decorative field waits for interaction', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'The progressive-loading contract is browser-independent.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await page.waitForTimeout(500);

  await expect(page.locator('script[src*="site-decorative-field.min.js"]')).toHaveCount(0);
  await page.mouse.wheel(0, 240);
  await expect.poll(
    () => page.locator('script[src*="site-decorative-field.min.js"]').count(),
    { timeout: 5000 }
  ).toBe(1);
});

for (const route of canonicalPages) {
  test(`@progressive ${route.name} keeps desktop 3D off the critical path and starts it after interaction`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'The progressive-loading contract is browser-independent.');
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('.hero-signature-logo')).toBeVisible();
    await page.waitForTimeout(250);

    await expect(page.locator('script[src*="taiyzun-sword.min.js"]')).toHaveCount(0);
    await expect(page.locator('script[src*="desktop-enhancements-loader.min.js"]')).toHaveCount(0);
    if (route.name === 'home') {
      await expect(page.locator('script[src*="home-interactions.min.js"]')).toHaveCount(0);
      await expect(page.locator('script[src*="video-carousel.min.js"]')).toHaveCount(0);
    }
    const earlyModels = await page.evaluate(() =>
      performance.getEntriesByType('resource').filter((entry) => /\.glb(?:$|\?)/i.test(entry.name)).length
    );
    expect(earlyModels).toBe(0);

    await page.mouse.move(720, 450);
    await expect.poll(
      () => page.locator('script[src*="taiyzun-sword.min.js"]').count(),
      { timeout: 5000 }
    ).toBe(1);
    await expect.poll(
      () => page.locator('script[src*="desktop-enhancements-loader.min.js"]').count(),
      { timeout: 5000 }
    ).toBe(1);
    if (route.name === 'home') {
      await expect.poll(
        () => page.locator('script[src*="home-interactions.min.js"]').count(),
        { timeout: 5000 }
      ).toBe(1);
      await page.locator('[data-video-carousel]').scrollIntoViewIfNeeded();
      await expect.poll(
        () => page.locator('script[src*="video-carousel.min.js"]').count(),
        { timeout: 5000 }
      ).toBe(1);
    }
    expect(runtimeErrors).toEqual([]);
  });
}
