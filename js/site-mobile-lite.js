(() => {
  const root = document.documentElement;
  const mobileQuery = window.matchMedia ? window.matchMedia('(max-width: 820px)') : null;
  const coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
  const compactLoaderQuery = window.matchMedia ? window.matchMedia('(max-width: 820px), (pointer: coarse)') : null;
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
    if (!document.getElementById('siteLoader') && !document.querySelector('.site-loader')) {
      root.classList.remove('has-site-loader', 'site-loader-active');
      document.body.classList.remove('site-loader-active');
      window.TAIYZUN_completeSiteLoader = () => {};
      return;
    }
    const startedAt = performance.now();
    let fontsReady = !document.fonts?.ready;
    // The complete static fallback ships in the initial HTML. WebGL is a
    // progressive enhancement and must not hold readable content backstage.
    let visualReady = true;
    let revealQueued = false;

    const loaderElements = new Set();
    const getLoaders = () => {
      [
        document.getElementById('siteLoader'),
        ...document.getElementsByClassName('site-loader')
      ].filter(Boolean).forEach((loader) => loaderElements.add(loader));

      return Array.from(loaderElements).filter((loader) => loader.isConnected);
    };

    const isCompactLoader = () => Boolean(
      window.TAIYZUN_MOBILE_LITE ||
      compactLoaderQuery?.matches
    );

    const readTiming = (loader, name, fallback) => {
      const value = Number(loader?.dataset?.[name]);
      return Number.isFinite(value) && value >= 0 ? value : fallback;
    };

    const syncLoaderStart = () => {
      const loaders = getLoaders();
      loaders.forEach((loader) => {
        const existingStart = Number(loader.dataset.start);
        if (!existingStart || existingStart < 1) loader.dataset.start = String(startedAt);
      });
      return loaders;
    };

    const hideLoaders = () => {
      const loaders = getLoaders();
      loaders.forEach((loader) => {
        if (loader.dataset.hidden === 'true') return;
        loader.dataset.hidden = 'true';
        loader.setAttribute('aria-hidden', 'true');
        loader.classList.add('is-hidden');
        window.setTimeout(() => {
          if (loader.dataset.hidden === 'true') {
            loader.hidden = true;
            loader.style.display = 'none';
          }
        }, 320);
      });
      document.body.classList.remove('site-loader-active');
      root.classList.remove('site-loader-active');
    };

    const requestHide = (force = false) => {
      if (!force && (!fontsReady || !visualReady)) {
        revealQueued = true;
        return;
      }

      revealQueued = false;
      const loaders = syncLoaderStart();
      const firstLoader = loaders[0];
      const loaderStart = Number(firstLoader?.dataset.start || startedAt);
      const elapsed = performance.now() - loaderStart;
      const compactLoader = isCompactLoader();
      const minVisible = compactLoader
        ? readTiming(firstLoader, 'compactMin', 180)
        : readTiming(firstLoader, 'defaultMin', 260);
      window.setTimeout(hideLoaders, Math.max(0, minVisible - elapsed));
    };

    const releaseWhenReady = () => {
      visualReady = true;
      if (revealQueued) requestHide();
    };

    window.addEventListener('taiyzun:3d-critical-ready', releaseWhenReady, { once: true });
    if (document.fonts?.ready) {
      document.fonts.ready.catch(() => undefined).then(() => {
        fontsReady = true;
        if (revealQueued) requestHide();
      });
    }

    root.classList.add('has-site-loader', 'site-loader-active');
    document.body.classList.add('site-loader-active');
    window.TAIYZUN_completeSiteLoader = requestHide;

    if (document.readyState === 'complete') {
      requestHide();
    } else {
      const firstLoader = getLoaders()[0];
      const domDelay = readTiming(firstLoader, 'domDelay', 80);
      const loadDelay = readTiming(firstLoader, 'loadDelay', 120);
      document.addEventListener('DOMContentLoaded', () => {
        window.setTimeout(requestHide, domDelay);
      }, { once: true });
      window.addEventListener('load', () => {
        window.setTimeout(requestHide, loadDelay);
      }, { once: true });
    }

    const compactLoader = isCompactLoader();
    const firstLoader = getLoaders()[0];
    const maxVisible = compactLoader
      ? readTiming(firstLoader, 'compactMax', 1200)
      : readTiming(firstLoader, 'defaultMax', 1800);
    window.setTimeout(() => requestHide(true), maxVisible);
  }

  function installSignatureVisibilityController() {
    const install = () => {
      const signatureLogo = document.querySelector('.hero-signature-logo');
      if (!signatureLogo || signatureLogo.dataset.visibilityReady === 'true') return;

      signatureLogo.dataset.visibilityReady = 'true';
      const signatureAnchor = document.querySelector('.hero, .page-hero');
      if (!signatureAnchor || document.body?.classList.contains('error-page')) {
        signatureLogo.classList.add('is-outside-hero');
        return;
      }

      const syncVisibility = (isVisible) => {
        signatureLogo.classList.toggle('is-outside-hero', !isVisible);
      };
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          ([entry]) => syncVisibility(Boolean(entry?.isIntersecting)),
          { threshold: 0.08 }
        );
        observer.observe(signatureAnchor);
        return;
      }

      const syncFallback = () => {
        const rect = signatureAnchor.getBoundingClientRect();
        syncVisibility(rect.bottom > 0 && rect.top < window.innerHeight);
      };
      window.addEventListener('scroll', syncFallback, { passive: true });
      window.addEventListener('resize', syncFallback, { passive: true });
      syncFallback();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
      install();
    }
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
      let scheduled = false;
      const interactionEvents = ['pointermove', 'pointerdown', 'wheel', 'keydown'];
      const startDesktopField = () => {
        if (scheduled) return;
        scheduled = true;
        interactionEvents.forEach((eventName) => window.removeEventListener(eventName, startDesktopField));
        window.setTimeout(() => {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(inject, { timeout: 1600 });
          } else {
            inject();
          }
        }, 120);
      };

      interactionEvents.forEach((eventName) => {
        window.addEventListener(eventName, startDesktopField, { once: true, passive: true });
      });
      window.setTimeout(startDesktopField, 30000);
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

    // Compact devices retain the static design until the visitor interacts.
    // This keeps WebGL and Three.js off the critical loading path.
  };

  window.TAIYZUN_loadDesktopEnhancements = function loadDesktopEnhancements(srcs) {
    const mobileLite = applyMobileLite();
    const pendingSrcs = Array.from(new Set(srcs || []))
      .filter((src) => src && !document.querySelector(`script[src="${src}"]`));

    if (!pendingSrcs.length) return;

    if (mobileLite) {
      const mobileSafeSrcs = pendingSrcs.filter((src) => /site-decorative-field(?:\.min)?\.js/.test(src));
      if (!mobileSafeSrcs.length) return;

      const injectMobileSafe = () => {
        mobileSafeSrcs.forEach((src) => {
          if (document.querySelector(`script[src="${src}"]`)) return;
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.defer = true;
          script.dataset.cfasync = 'false';
          document.body.appendChild(script);
        });
      };
      const scheduleMobileSafe = () => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(injectMobileSafe, { timeout: 1800 });
        } else {
          window.setTimeout(injectMobileSafe, 520);
        }
      };
      let scheduled = false;
      const interactionEvents = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'];
      const startMobileSafe = () => {
        if (scheduled) return;
        scheduled = true;
        interactionEvents.forEach((eventName) => window.removeEventListener(eventName, startMobileSafe));
        scheduleMobileSafe();
      };
      interactionEvents.forEach((eventName) => {
        window.addEventListener(eventName, startMobileSafe, { once: true, passive: eventName !== 'keydown' });
      });
      window.setTimeout(startMobileSafe, 30000);
      return;
    }

    window.TAIYZUN_DESKTOP_ENHANCEMENT_SCRIPTS = pendingSrcs;
    const helperSrc = '/js/desktop-enhancements-loader.min.js?v=20260704a';
    if (document.querySelector(`script[src="${helperSrc}"]`)) return;

    const injectHelper = () => {
      if (applyMobileLite()) return;
      if (document.querySelector(`script[src="${helperSrc}"]`)) return;
      const script = document.createElement('script');
      script.src = helperSrc;
      script.async = true;
      script.defer = true;
      script.dataset.cfasync = 'false';
      document.body.appendChild(script);
    };

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(injectHelper, { timeout: 2400 });
      } else {
        window.setTimeout(injectHelper, 1200);
      }
    };

    let scheduled = false;
    const interactionEvents = ['pointermove', 'pointerdown', 'wheel', 'keydown'];
    const startDesktopEnhancements = () => {
      if (scheduled) return;
      scheduled = true;
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, startDesktopEnhancements));
      window.setTimeout(schedule, 180);
    };
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, startDesktopEnhancements, { once: true, passive: true });
    });
    window.setTimeout(startDesktopEnhancements, 30000);
  };

  applyMobileLite();
  installPageLoaderController();
  installSignatureVisibilityController();
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

  window.dispatchEvent(new Event('taiyzun:mobile-lite-ready'));
})();
