(() => {
  const root = document.documentElement;
  const mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 820px)') : null;
  const coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  function shouldUseMobileLite() {
    return Boolean(
      (mobileQuery && mobileQuery.matches) ||
      (coarseQuery && coarseQuery.matches) ||
      (reduceQuery && reduceQuery.matches) ||
      /iP(hone|ad|od)|Android/i.test(navigator.userAgent) ||
      (connection && connection.saveData)
    );
  }

  function applyMobileLite() {
    const enabled = shouldUseMobileLite();
    window.TAIYZUN_MOBILE_LITE = enabled;
    root.classList.toggle('site-mobile-lite', enabled);
    root.classList.toggle('ambient-video-disabled', enabled);
    if (document.body) {
      document.body.classList.toggle('site-mobile-lite', enabled);
    }
    return enabled;
  }

  function installPageLoaderController() {
    if (!document.body || document.body.dataset.siteLoaderReady === 'true') return;

    document.body.dataset.siteLoaderReady = 'true';
    const startedAt = performance.now();

    const getLoaders = () => Array.from(new Set([
      ...document.querySelectorAll('.site-loader'),
      ...document.querySelectorAll('#siteLoader')
    ]));

    const syncLoaderStart = () => {
      getLoaders().forEach((loader) => {
        const existingStart = Number(loader.dataset.start);
        if (!existingStart || existingStart < 1) loader.dataset.start = String(startedAt);
      });
    };

    const hideLoaders = () => {
      getLoaders().forEach((loader) => {
        if (loader.dataset.hidden === 'true') return;
        loader.dataset.hidden = 'true';
        loader.setAttribute('aria-hidden', 'true');
        loader.classList.add('is-hidden');
      });
      document.body.classList.remove('site-loader-active');
    };

    const requestHide = () => {
      syncLoaderStart();
      const firstLoader = getLoaders()[0];
      const loaderStart = Number(firstLoader?.dataset.start || startedAt);
      const elapsed = performance.now() - loaderStart;
      const compactLoader = Boolean(
        window.TAIYZUN_MOBILE_LITE ||
        window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches
      );
      const minVisible = compactLoader ? 520 : 720;
      window.setTimeout(hideLoaders, Math.max(0, minVisible - elapsed));
    };

    document.body.classList.add('site-loader-active');
    window.TAIYZUN_completeSiteLoader = requestHide;

    if (document.readyState === 'complete') {
      requestHide();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        window.setTimeout(requestHide, 700);
      }, { once: true });
      window.addEventListener('load', () => {
        window.setTimeout(requestHide, 900);
      }, { once: true });
    }

    const maxVisible = Boolean(
      window.TAIYZUN_MOBILE_LITE ||
      window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches
    ) ? 2400 : 3600;
    window.setTimeout(hideLoaders, maxVisible);
  }

  window.TAIYZUN_applyMobileLite = applyMobileLite;

  window.TAIYZUN_load3DField = function load3DField(src) {
    if (!src || document.querySelector(`script[src="${src}"]`)) return;

    const compact = applyMobileLite();
    const reduceMotion = reduceQuery && reduceQuery.matches;
    const connectionSlow =
      connection &&
      (connection.saveData || /(^|-)2g$|slow-2g/i.test(connection.effectiveType || ''));

    const inject = () => {
      if (document.querySelector(`script[src="${src}"]`)) return;

      const script = document.createElement('script');
      script.src = src;
      script.type = 'module';
      script.crossOrigin = 'anonymous';
      script.dataset.cfasync = 'false';
      document.body.appendChild(script);
    };

    if (!compact && !connectionSlow) {
      inject();
      return;
    }

    if (reduceMotion) return;

    let scheduled = false;
    const schedule = (delay) => {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(inject, { timeout: 2200 });
        } else {
          inject();
        }
      }, delay);
    };

    const interactionStart = () => schedule(720);
    window.addEventListener('pointerdown', interactionStart, { once: true, passive: true });
    window.addEventListener('touchstart', interactionStart, { once: true, passive: true });
    window.addEventListener('wheel', interactionStart, { once: true, passive: true });
    window.addEventListener('keydown', interactionStart, { once: true });

    const settledStart = () => schedule(connectionSlow ? 14000 : 9000);
    if (document.readyState === 'complete') {
      settledStart();
    } else {
      window.addEventListener('load', settledStart, { once: true });
    }
  };

  window.TAIYZUN_loadDesktopEnhancements = function loadDesktopEnhancements(srcs) {
    if (applyMobileLite()) return;
    const pendingSrcs = Array.from(new Set(srcs || []))
      .filter((src) => src && !document.querySelector(`script[src="${src}"]`));

    if (!pendingSrcs.length) return;

    const loadScript = (src) => new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.defer = true;
      script.onload = resolve;
      script.onerror = resolve;
      document.body.appendChild(script);
    });

    const inject = () => {
      if (applyMobileLite()) return;
      pendingSrcs.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve());
    };

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(inject, { timeout: 4200 });
      } else {
        window.setTimeout(inject, 1600);
      }
    };

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }
  };

  applyMobileLite();
  installPageLoaderController();
  [mobileQuery, coarseQuery, reduceQuery].forEach((query) => {
    if (!query) return;
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', applyMobileLite);
    } else if (typeof query.addListener === 'function') {
      query.addListener(applyMobileLite);
    }
  });
  if (connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', applyMobileLite);
  }
})();
