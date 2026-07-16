(function loadCreationsCss() {
  const styles = [
    '/css/taiyzun-creations.bundle.min.css?v=20260717a',
    '/css/taiyzun-system.css?v=20260717a'
  ];
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
    if (loaded) return;
    loaded = true;
    if (timer) window.clearTimeout(timer);

    document.documentElement.classList.add('creations-full-css-loading');
    let pending = styles.length;
    styles.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        pending -= 1;
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.creationsFullCss = 'true';
      link.onload = () => {
        pending -= 1;
        if (pending <= 0) document.documentElement.classList.add('creations-full-css-ready');
      };
      document.head.appendChild(link);
    });
    if (pending <= 0) document.documentElement.classList.add('creations-full-css-ready');
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

  // The critical stylesheet fully presents the first view. Load the larger
  // gallery bundle only when a compact-device visitor begins interacting.
})();
