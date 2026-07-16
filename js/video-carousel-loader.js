(() => {
  const carousel = document.querySelector('[data-video-carousel]');
  if (!carousel) return;

  const src = '/js/video-carousel.min.js?v=20260717a';
  let loaded = false;
  let observer = null;

  const inject = () => {
    if (loaded || document.querySelector(`script[src="${src}"]`)) return;
    loaded = true;
    observer?.disconnect();
    observer = null;

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.cfasync = 'false';
    document.body.appendChild(script);
  };

  ['pointerenter', 'pointerdown', 'focusin', 'touchstart'].forEach((eventName) => {
    carousel.addEventListener(eventName, inject, { once: true, passive: true });
  });

  const compact = Boolean(
    window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches ||
    /iP(hone|ad|od)|Android/i.test(navigator.userAgent || '') ||
    navigator.connection?.saveData
  );

  if (!compact && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) inject();
    }, { rootMargin: '300px 0px', threshold: 0 });
    observer.observe(carousel);
  }

  window.setTimeout(inject, 30000);
})();
