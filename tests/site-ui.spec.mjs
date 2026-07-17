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
  { name: 'narrow-mobile', width: 320, height: 800 },
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
    await loader.waitFor({ state: 'hidden', timeout: 15000 });
  }
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#mainNav')).toBeVisible();

  const staticFallbacks = page.locator(
    '[data-taiyzun-sword-fallback], [data-taiyzun-3d-fallback]'
  );
  if (await staticFallbacks.count()) {
    await expect(staticFallbacks).toHaveCount(2);
    await expect.poll(
      () => staticFallbacks.evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
      ),
      { timeout: 15000 }
    ).toBe(true);
  }

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
        const primaryContent = document.querySelector('.hero-content, .page-hero-content');
        const objectStages = Array.from(document.querySelectorAll('[data-taiyzun-sword], [data-taiyzun-at]'));
        const navRect = nav.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const protectedContentRects = [];
        if (primaryContent) {
          const textWalker = document.createTreeWalker(primaryContent, NodeFilter.SHOW_TEXT);
          for (let node = textWalker.nextNode(); node; node = textWalker.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            protectedContentRects.push(
              ...Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0)
            );
          }
          primaryContent.querySelectorAll('a, button, input, textarea, select, img, svg, video').forEach((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) protectedContentRects.push(rect);
          });
        }
        const overlaps = (first, second) => Boolean(
          first &&
          second &&
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top
        );
        const hitAt = (rect) => document.elementFromPoint(
          Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2)),
          Math.min(innerHeight - 1, Math.max(0, rect.top + Math.min(rect.height / 2, 24)))
        );
        const navHit = hitAt(navRect);
        const headingHit = hitAt(headingRect);
        const stageRects = objectStages.map((stage) => {
          const style = getComputedStyle(stage);
          const rect = stage.getBoundingClientRect();
          const fallback = stage.querySelector('[data-taiyzun-sword-fallback], [data-taiyzun-3d-fallback]');
          const fallbackStyle = fallback ? getComputedStyle(fallback) : null;
          const fallbackRect = fallback ? fallback.getBoundingClientRect() : null;
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0,
            pointerEvents: style.pointerEvents,
            zIndex: Number.parseInt(style.zIndex, 10) || 0,
            fallbackVisible: Boolean(
              fallback &&
              !fallback.hidden &&
              fallbackStyle?.display !== 'none' &&
              fallbackStyle?.visibility !== 'hidden' &&
              Number(fallbackStyle?.opacity || 0) > 0
            ),
            fallbackLoaded: Boolean(fallback && fallback.naturalWidth > 0 && fallback.naturalHeight > 0),
            fallbackContained: Boolean(
              fallbackRect &&
              fallbackRect.left >= rect.left - 1 &&
              fallbackRect.right <= rect.right + 1 &&
              fallbackRect.top >= rect.top - 1 &&
              fallbackRect.bottom <= rect.bottom + 1
            ),
            overlapsProtectedUi: overlaps(fallbackRect, navRect) || protectedContentRects.some((rect) => overlaps(fallbackRect, rect))
          };
        });
        const stagesOverlap = stageRects.length === 2 &&
          stageRects[0].left < stageRects[1].right &&
          stageRects[0].right > stageRects[1].left &&
          stageRects[0].top < stageRects[1].bottom &&
          stageRects[0].bottom > stageRects[1].top;
        const contentZIndex = Number.parseInt(primaryContent ? getComputedStyle(primaryContent).zIndex : '0', 10) || 0;

        return {
          overflow: root.scrollWidth - root.clientWidth,
          loaderVisible: Boolean(loader && getComputedStyle(loader).display !== 'none' && getComputedStyle(loader).visibility !== 'hidden'),
          navHit: Boolean(navHit && (navHit === nav || nav.contains(navHit))),
          headingHit: Boolean(headingHit && (headingHit === heading || heading.contains(headingHit))),
          stageRects,
          stagesOverlap,
          contentZIndex
        };
      });

      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.loaderVisible).toBe(false);
      expect(geometry.navHit).toBe(true);
      expect(geometry.headingHit).toBe(true);
      if (!['404', '500'].includes(route.name)) {
        expect(geometry.stageRects).toHaveLength(2);
        expect(geometry.stageRects.every((stage) => stage.visible)).toBe(true);
        expect(geometry.stageRects.every((stage) => stage.fallbackVisible)).toBe(true);
        expect(geometry.stageRects.every((stage) => stage.fallbackLoaded)).toBe(true);
        expect(geometry.stageRects.every((stage) => stage.fallbackContained)).toBe(true);
        expect(geometry.stageRects.every((stage) => stage.pointerEvents === 'none')).toBe(true);
        expect(geometry.stageRects.every((stage) => !stage.overlapsProtectedUi)).toBe(true);
        expect(geometry.stagesOverlap).toBe(false);
        expect(Math.max(...geometry.stageRects.map((stage) => stage.zIndex))).toBeLessThan(geometry.contentZIndex);
      }
      for (const frame of await page.locator('iframe').all()) {
        await expect(frame).toHaveAttribute('title', /\S+/);
      }
      const lightboxImageWrap = page.locator('#lbImgWrap');
      if (await lightboxImageWrap.count()) {
        await expect(lightboxImageWrap).not.toHaveAttribute('tabindex', /\S+/);
        await expect(lightboxImageWrap).not.toHaveAttribute('aria-label', /\S+/);
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
        opacity: Number(getComputedStyle(element).opacity),
        imageBorderRadius: getComputedStyle(element.querySelector('img')).borderRadius,
        imageObjectFit: getComputedStyle(element.querySelector('img')).objectFit
      };
    });
    expect(initialState.overlapsProtectedUi).toBe(false);
    expect(initialState.opacity).toBeGreaterThan(0);
    expect(initialState.imageBorderRadius).toBe('0px');
    expect(initialState.imageObjectFit).toBe('contain');

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
  await expect(page.locator('script[src*="video-carousel.min.js"]')).toHaveCount(0);
  await page.mouse.wheel(0, 240);
  await expect.poll(
    () => page.locator('script[src*="site-decorative-field.min.js"]').count(),
    { timeout: 5000 }
  ).toBe(1);
  await expect(page.locator('script[src*="video-carousel.min.js"]')).toHaveCount(0);
});

test('@progressive mobile 3D starts both stages after one interaction', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'The progressive-loading contract is browser-independent.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await page.waitForTimeout(350);

  await expect(page.locator('script[src*="taiyzun-sword.min.js"]')).toHaveCount(0);
  const earlyModels = await page.evaluate(() =>
    performance.getEntriesByType('resource').filter((entry) => /\.glb(?:$|\?)/i.test(entry.name)).length
  );
  expect(earlyModels).toBe(0);

  await page.mouse.wheel(0, 240);
  await expect.poll(
    () => page.locator('script[src*="taiyzun-sword.min.js"]').count(),
    { timeout: 5000 }
  ).toBe(1);
  await expect.poll(
    () => page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
      stages.length === 2 && stages.every((stage) => stage.dataset.status === 'ready')
    ),
    { timeout: 20000 }
  ).toBe(true);
  await expect.poll(
    () => page.evaluate(() =>
      performance.getEntriesByType('resource').filter((entry) => /\.glb(?:$|\?)/i.test(entry.name)).length
    ),
    { timeout: 5000 }
  ).toBe(2);

  const modelLoads = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter((entry) => /\.glb(?:$|\?)/i.test(entry.name))
      .map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
        responseEnd: entry.responseEnd
      }))
  );
  expect(modelLoads).toHaveLength(2);
  expect(modelLoads[0].name).toContain('Taiyzun_Sword_Web.glb');
  expect(modelLoads[1].name).toContain('Taiyzun_At_Logo_Web.glb');
  expect(modelLoads[1].startTime).toBeGreaterThanOrEqual(modelLoads[0].responseEnd - 1);
  await expect(page.locator('[data-taiyzun-sword]')).toHaveAttribute('data-initialisation-order', '1');
  await expect(page.locator('[data-taiyzun-at]')).toHaveAttribute('data-initialisation-order', '2');

  const renderedStages = await page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
    stages.map((stage) => {
      const canvas = stage.querySelector('[data-taiyzun-sword-canvas], [data-taiyzun-3d-canvas]');
      const fallback = stage.querySelector('[data-taiyzun-sword-fallback], [data-taiyzun-3d-fallback]');
      const canvasStyle = canvas ? getComputedStyle(canvas) : null;
      const canvasRect = canvas?.getBoundingClientRect();
      return {
        status: stage.dataset.status,
        canvasVisible: Boolean(
          canvas &&
          canvasRect &&
          canvas.width > 0 &&
          canvas.height > 0 &&
          canvasRect.width > 0 &&
          canvasRect.height > 0 &&
          canvasStyle?.display !== 'none' &&
          canvasStyle?.visibility !== 'hidden' &&
          Number(canvasStyle?.opacity || 0) > 0
        ),
        fallbackHidden: Boolean(fallback?.hidden)
      };
    })
  );
  expect(renderedStages).toHaveLength(2);
  expect(renderedStages.every((stage) => stage.status === 'ready' && stage.canvasVisible && stage.fallbackHidden)).toBe(true);
});

test('@progressive constrained connections retain both static 3D fallbacks', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'The progressive-loading contract is browser-independent.');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        saveData: false,
        effectiveType: 'slow-2g',
        addEventListener() {}
      }
    });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 8 });
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);

  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(1800);
  await expect(page.locator('script[src*="taiyzun-sword.min.js"]')).toHaveCount(0);
  const staticFallbacks = page.locator('[data-taiyzun-sword-fallback], [data-taiyzun-3d-fallback]');
  await expect(staticFallbacks).toHaveCount(2);
  expect(await staticFallbacks.evaluateAll((fallbacks) => fallbacks.every((fallback) => {
    const style = getComputedStyle(fallback);
    return !fallback.hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
  }))).toBe(true);
});

test('@progressive failed sword model preserves fallback and continues to the at model', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'The progressive-loading contract is browser-independent.');
  await page.route('**/Taiyzun_Sword_Web.glb*', (route) => route.abort('failed'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);

  await page.mouse.wheel(0, 240);
  await expect.poll(
    () => page.locator('[data-taiyzun-sword]').getAttribute('data-status'),
    { timeout: 10000 }
  ).toBe('static');
  await expect.poll(
    () => page.locator('[data-taiyzun-at]').getAttribute('data-status'),
    { timeout: 20000 }
  ).toBe('ready');
  await expect(page.locator('[data-taiyzun-sword-fallback]')).toBeVisible();
  await expect(page.locator('[data-taiyzun-at] [data-taiyzun-3d-fallback]')).toBeHidden();
});

test('@progressive mobile decorative field follows dynamic Odyssey growth', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'The progressive-loading contract is browser-independent.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/odyssey', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await page.mouse.wheel(0, 240);
  await expect.poll(
    () => page.locator('script[src*="site-decorative-field.min.js"]').count(),
    { timeout: 5000 }
  ).toBe(1);
  const field = page.locator('#siteDecorativeField');
  await expect(field).toBeAttached({ timeout: 5000 });
  await expect.poll(
    () => field.evaluate((element) => Number.parseFloat(element.style.height) || 0),
    { timeout: 10000 }
  ).toBeGreaterThan(0);
  const initialHeight = await field.evaluate((element) => Number.parseFloat(element.style.height));

  await page.locator('#galleryGrid').evaluate((grid) => {
    grid.style.minHeight = `${grid.scrollHeight + 5000}px`;
  });
  await expect.poll(
    () => field.evaluate((element) => Number.parseFloat(element.style.height)),
    { timeout: 10000 }
  ).toBeGreaterThan(initialHeight + 4000);
});

test('@decorative all primary pages cover their full length and breadth without collisions', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The shared deterministic decorative layout needs one browser contract run.');
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const route of canonicalPages) {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await page.mouse.wheel(0, 240);
    const field = page.locator('#siteDecorativeField');
    await expect(field).toBeAttached({ timeout: 10000 });
    await expect.poll(
      () => field.getAttribute('data-coverage-protocol'),
      { timeout: 12000 }
    ).toBe('full-page-even-v1');
    await page.waitForTimeout(1800);
    await expect.poll(
      () => field.evaluate((element) => {
        const fieldHeight = Number.parseFloat(element.style.height) || 0;
        const pageHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        return fieldHeight >= pageHeight - 2;
      }),
      { timeout: 12000 }
    ).toBe(true);
    await expect.poll(
      () => page.locator('.site-decorative-png').evaluateAll((images) => {
        const field = document.querySelector('#siteDecorativeField');
        const pageHeight = Number(field?.dataset.coverageHeight) || 1;
        const declaredBands = Number(field?.dataset.coverageBands) || 0;
        const centres = images
          .map((image) => {
            const rect = image.getBoundingClientRect();
            return (rect.top + scrollY + rect.height * 0.5) / Math.max(pageHeight, 1);
          })
          .sort((left, right) => left - right);
        const gaps = centres.slice(1).map((value, index) => value - centres[index]);
        return images.length === declaredBands &&
          (centres[0] ?? 1) < 0.16 &&
          (centres.at(-1) ?? 0) > 0.84 &&
          Math.max(0, ...gaps) < 0.2;
      }),
      { timeout: 20000, intervals: [500, 750, 1000] }
    ).toBe(true);

    const coverage = await page.locator('.site-decorative-png').evaluateAll((images) => {
      const field = document.querySelector('#siteDecorativeField');
      const pageHeight = Number(field?.dataset.coverageHeight) ||
        Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const viewportWidth = document.documentElement.clientWidth;
      const entries = images.map((image) => {
        const state = image._decorState;
        const rect = image.getBoundingClientRect();
        const documentTop = rect.top + window.scrollY;
        return {
          band: Number(image.dataset.coverageBand || 0),
          lane: image.dataset.coverageLane || '',
          centreX: (rect.left + rect.right) * 0.5 / Math.max(viewportWidth, 1),
          centreY: (documentTop + rect.height * 0.5) / Math.max(pageHeight, 1),
          left: rect.left,
          right: rect.right,
          top: documentTop,
          bottom: documentTop + rect.height,
          width: rect.width,
          height: rect.height,
          pointerEvents: getComputedStyle(image).pointerEvents,
          objectFit: getComputedStyle(image).objectFit,
          ariaHidden: image.getAttribute('aria-hidden'),
          focusable: image.tabIndex >= 0,
          hasState: Boolean(state)
        };
      }).sort((left, right) => left.centreY - right.centreY);
      const verticalCentres = entries.map((entry) => entry.centreY);
      const verticalGaps = verticalCentres.slice(1).map((value, index) => value - verticalCentres[index]);
      let overlaps = 0;
      for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
          const left = entries[leftIndex];
          const right = entries[rightIndex];
          const overlapWidth = Math.min(left.right, right.right) - Math.max(left.left, right.left);
          const overlapHeight = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
          if (overlapWidth > 8 && overlapHeight > 8) overlaps += 1;
        }
      }
      return {
        count: entries.length,
        uniqueBands: new Set(entries.map((entry) => entry.band)).size,
        uniqueLanes: new Set(entries.map((entry) => entry.lane)).size,
        firstCentreY: verticalCentres[0] ?? 1,
        lastCentreY: verticalCentres.at(-1) ?? 0,
        maxVerticalGap: Math.max(0, ...verticalGaps),
        minCentreX: Math.min(1, ...entries.map((entry) => entry.centreX)),
        maxCentreX: Math.max(0, ...entries.map((entry) => entry.centreX)),
        allInsideWidth: entries.every((entry) => entry.left >= -1 && entry.right <= viewportWidth + 1),
        allDecorativeOnly: entries.every((entry) =>
          entry.hasState &&
          entry.pointerEvents === 'none' &&
          entry.objectFit === 'contain' &&
          entry.ariaHidden === 'true' &&
          !entry.focusable
        ),
        overlaps
      };
    });

    expect(coverage.count, route.name).toBeGreaterThanOrEqual(10);
    expect(coverage.uniqueBands, route.name).toBe(coverage.count);
    expect(coverage.uniqueLanes, route.name).toBeGreaterThanOrEqual(5);
    expect(coverage.firstCentreY, route.name).toBeLessThan(0.16);
    expect(coverage.lastCentreY, route.name).toBeGreaterThan(0.84);
    expect(coverage.maxVerticalGap, route.name).toBeLessThan(0.2);
    expect(coverage.minCentreX, route.name).toBeLessThan(0.25);
    expect(coverage.maxCentreX, route.name).toBeGreaterThan(0.75);
    expect(coverage.allInsideWidth, route.name).toBe(true);
    expect(coverage.allDecorativeOnly, route.name).toBe(true);
    expect(coverage.overlaps, route.name).toBe(0);
  }
});

for (const route of canonicalPages) {
  test(`@3d-static ${route.name} keeps both fallbacks for reduced motion`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'The reduced-motion contract is browser-independent.');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(350);

    await expect(page.locator('script[src*="taiyzun-sword.min.js"]')).toHaveCount(0);
    const staticObjects = await page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
      stages.map((stage) => {
        const stageStyle = getComputedStyle(stage);
        const canvas = stage.querySelector('[data-taiyzun-sword-canvas], [data-taiyzun-3d-canvas]');
        const fallback = stage.querySelector('[data-taiyzun-sword-fallback], [data-taiyzun-3d-fallback]');
        const canvasStyle = canvas ? getComputedStyle(canvas) : null;
        const fallbackStyle = fallback ? getComputedStyle(fallback) : null;
        const rect = stage.getBoundingClientRect();
        return {
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          stageVisible: stageStyle.display !== 'none' && Number(stageStyle.opacity) > 0,
          canvasHidden: !canvas || canvasStyle?.display === 'none' || Number(canvasStyle?.opacity || 0) === 0,
          fallbackVisible: Boolean(
            fallback &&
            !fallback.hidden &&
            fallbackStyle?.display !== 'none' &&
            fallbackStyle?.visibility !== 'hidden' &&
            Number(fallbackStyle?.opacity || 0) > 0
          )
        };
      })
    );
    expect(staticObjects).toHaveLength(2);
    expect(staticObjects.every((object) => object.stageVisible && object.canvasHidden && object.fallbackVisible)).toBe(true);
    const [sword, at] = staticObjects;
    const overlap =
      sword.rect.left < at.rect.right &&
      sword.rect.right > at.rect.left &&
      sword.rect.top < at.rect.bottom &&
      sword.rect.bottom > at.rect.top;
    expect(overlap).toBe(false);
  });
}

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
    await page.evaluate(() => scrollTo(0, 64));
    await page.waitForTimeout(800);
    await expect(page.locator('script[src*="taiyzun-sword.min.js"]')).toHaveCount(0);
    await expect(page.locator('script[src*="desktop-enhancements-loader.min.js"]')).toHaveCount(0);

    await page.mouse.wheel(0, 240);
    await expect.poll(
      () => page.locator('script[src*="taiyzun-sword.min.js"]').count(),
      { timeout: 5000 }
    ).toBe(1);
    await expect.poll(
      () => page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
        stages.length === 2 && stages.every((stage) => stage.dataset.status === 'ready')
      ),
      { timeout: 25000 }
    ).toBe(true);
    await expect.poll(
      () => page.evaluate(() =>
        performance.getEntriesByType('resource').filter((entry) => /\.glb(?:$|\?)/i.test(entry.name)).length
      ),
      { timeout: 5000 }
    ).toBe(2);
    await expect.poll(
      () => page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
        stages.every((stage) => {
          const canvas = stage.querySelector('[data-taiyzun-sword-canvas], [data-taiyzun-3d-canvas]');
          const fallback = stage.querySelector('[data-taiyzun-sword-fallback], [data-taiyzun-3d-fallback]');
          const canvasStyle = canvas ? getComputedStyle(canvas) : null;
          const canvasRect = canvas?.getBoundingClientRect();
          return Boolean(
            canvas &&
            canvasRect &&
            canvas.width > 0 &&
            canvas.height > 0 &&
            canvasRect.width > 0 &&
            canvasRect.height > 0 &&
            canvasStyle?.display !== 'none' &&
            canvasStyle?.visibility !== 'hidden' &&
            Number(canvasStyle?.opacity || 0) > 0 &&
            fallback?.hidden
          );
        })
      ),
      { timeout: 10000 }
    ).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(
      () => page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
        stages.every((stage) => {
          const rect = stage.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
        })
      ),
      { timeout: 5000 }
    ).toBe(true);
    await page.mouse.move(720, 450);
    const visibleObjects = await page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
      stages.map((stage) => ({
        status: stage.dataset.status,
        object: stage.dataset.object,
        spinAxis: stage.dataset.spinAxis,
        spinDirection: stage.dataset.spinDirection,
        spinRate: Number(stage.dataset.spinRate || 0)
      }))
    );
    expect(visibleObjects).toHaveLength(2);
    const swordState = visibleObjects.find((object) => object.object === 'sword');
    expect(swordState).toBeTruthy();
    const atState = visibleObjects.find((object) => object.object === 'at');
    expect(atState).toBeTruthy();
    await expect(page.locator('[data-taiyzun-sword]')).toHaveAttribute('data-spin-axis', 'y');
    await expect(page.locator('[data-taiyzun-sword]')).toHaveAttribute('data-spin-direction', 'positive');
    await expect(page.locator('[data-taiyzun-sword]')).toHaveAttribute('data-spin-rate', '0.14');
    await expect(page.locator('[data-taiyzun-at]')).toHaveAttribute('data-spin-axis', 'z');
    await expect(page.locator('[data-taiyzun-at]')).toHaveAttribute('data-spin-direction', 'clockwise');
    await expect(page.locator('[data-taiyzun-at]')).toHaveAttribute('data-spin-rate', '0.24');
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

test('@3d-motion all primary pages preserve the original continuous rotation directions', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One Chromium pass verifies the shared WebGL motion protocol.');
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const route of canonicalPages) {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route.name).toBe(200);
    await page.evaluate(() => {
      scrollTo(0, 0);
      window.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: Math.round(innerWidth * 0.5),
        clientY: Math.round(innerHeight * 0.5)
      }));
    });
    await expect.poll(
      () => page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
        stages.length === 2 && stages.every((stage) => stage.dataset.status === 'ready')
      ),
      { timeout: 25000 }
    ).toBe(true);
    await page.mouse.move(720, 450);
    await expect.poll(
      () => page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
        stages.every((stage) => Number.isFinite(Number(stage.dataset.spinPhase)))
      ),
      { timeout: 5000 }
    ).toBe(true);
    await page.waitForTimeout(3000);
    const start = await page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
      Object.fromEntries(stages.map((stage) => [stage.dataset.object, {
        phase: Number(stage.dataset.spinPhase),
        rotationY: Number(stage.dataset.rotationY),
        rotationZ: Number(stage.dataset.rotationZ)
      }]))
    );

    await expect.poll(
      async () => {
        const current = await page.locator('[data-taiyzun-sword], [data-taiyzun-at]').evaluateAll((stages) =>
          Object.fromEntries(stages.map((stage) => [stage.dataset.object, {
            phase: Number(stage.dataset.spinPhase),
            rotationY: Number(stage.dataset.rotationY),
            rotationZ: Number(stage.dataset.rotationZ)
          }]))
        );
        return {
          swordPhaseAdvances: current.sword.phase - start.sword.phase > 0.04,
          swordTurnsPositive: current.sword.rotationY - start.sword.rotationY > 0.035,
          atPhaseAdvances: current.at.phase - start.at.phase > 0.07,
          atTurnsClockwise: current.at.rotationZ - start.at.rotationZ < -0.06
        };
      },
      { timeout: 12000, intervals: [1000, 1500, 2000] }
    ).toEqual({
      swordPhaseAdvances: true,
      swordTurnsPositive: true,
      atPhaseAdvances: true,
      atTurnsClockwise: true
    });
  }
});
