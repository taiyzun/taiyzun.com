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

  window.TAIYZUN_applyMobileLite = applyMobileLite;
  window.TAIYZUN_loadDesktopEnhancements = function loadDesktopEnhancements(srcs) {
    if (applyMobileLite()) return;
    srcs.forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) return;
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.defer = true;
      document.body.appendChild(script);
    });
  };

  applyMobileLite();
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
