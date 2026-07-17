(() => {
  const styles = [
    '/css/taiyzun-index.bundle.min.css?v=20260717b',
    '/css/taiyzun-system.css?v=20260717c'
  ];
  let loaded = false;

  const isCompact = () => Boolean(
    window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches ||
    /iP(hone|ad|od)|Android/i.test(navigator.userAgent || '') ||
    navigator.connection?.saveData
  );

  const inject = () => {
    if (loaded) return;
    loaded = true;
    const shouldBlockFirstRender = document.readyState === 'loading' && !isCompact();
    styles.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.homeFullCss = 'true';
      if (shouldBlockFirstRender) {
        link.setAttribute('blocking', 'render');
        link.fetchPriority = 'high';
      }
      document.head.appendChild(link);
    });
  };

  window.TAIYZUN_loadHomeFullCss = inject;
  if (!isCompact()) {
    inject();
    return;
  }

  ['pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, inject, { once: true, passive: true });
  });
})();
