(() => {
  const root = window;
  const srcs = Array.from(new Set(root.TAIYZUN_DESKTOP_ENHANCEMENT_SCRIPTS || []))
    .filter((src) => src && !document.querySelector(`script[src="${src}"]`));

  if (!srcs.length) return;

  const shouldUseMobileLite = () => Boolean(
    root.TAIYZUN_applyMobileLite?.() ||
    root.matchMedia?.('(max-width: 820px), (pointer: coarse), (prefers-reduced-motion: reduce)')?.matches ||
    /iP(hone|ad|od)|Android/i.test(navigator.userAgent || '') ||
    navigator.connection?.saveData
  );

  if (shouldUseMobileLite()) return;

  const loadScript = (src) => new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.defer = true;
    script.dataset.cfasync = 'false';
    script.onload = resolve;
    script.onerror = resolve;
    document.body.appendChild(script);
  });

  const inject = () => {
    if (shouldUseMobileLite()) return;
    srcs.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve());
  };

  if ('requestIdleCallback' in root) {
    root.requestIdleCallback(inject, { timeout: 4200 });
  } else {
    root.setTimeout(inject, 1600);
  }
})();
