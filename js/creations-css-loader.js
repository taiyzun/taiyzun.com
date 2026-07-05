(function loadCreationsCss() {
  const href = '/css/taiyzun-creations.bundle.min.css?v=20260705c';
  let loaded = false;
  let timer = 0;

  const isCompact = () => {
    const compactViewport = window.matchMedia && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    const compactDevice = /iP(hone|ad|od)|Android/i.test(navigator.userAgent || '');
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    return Boolean(compactViewport || compactDevice || saveData);
  };

  const hasRequestedImage = () => {
    const params = new URLSearchParams(window.location.search || '');
    return params.has('image') || params.has('creation') || /(?:image|creation)=/i.test(window.location.hash || '');
  };

  const inject = () => {
    if (loaded || document.querySelector('link[href="' + href + '"]')) return;
    loaded = true;
    if (timer) window.clearTimeout(timer);

    document.documentElement.classList.add('creations-full-css-loading');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.creationsFullCss = 'true';
    link.onload = () => {
      document.documentElement.classList.add('creations-full-css-ready');
    };
    document.head.appendChild(link);
  };

  const schedule = (delay, timeout) => {
    if (loaded || timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      if ('requestIdleCallback' in window) window.requestIdleCallback(inject, { timeout });
      else inject();
    }, delay);
  };

  window.TAIYZUN_loadCreationsFullCss = inject;

  if (!isCompact() || hasRequestedImage()) {
    inject();
    return;
  }

  const promptStart = () => inject();
  window.addEventListener('scroll', promptStart, { once: true, passive: true });
  window.addEventListener('wheel', promptStart, { once: true, passive: true });
  window.addEventListener('touchstart', promptStart, { once: true, passive: true });
  window.addEventListener('keydown', promptStart, { once: true });

  const settledStart = () => schedule(12000, 3600);
  if (document.readyState === 'complete') settledStart();
  else window.addEventListener('load', settledStart, { once: true });
})();
