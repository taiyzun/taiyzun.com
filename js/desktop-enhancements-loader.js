(() => {
  const root = window;
  const srcs = Array.from(new Set(root.TAIYZUN_DESKTOP_ENHANCEMENT_SCRIPTS || []))
    .filter((src) => src && !document.querySelector(`script[src="${src}"]`))
    .sort((left, right) => {
      const decorativePriority = (src) => /site-decorative-field(?:\.min)?\.js/.test(src) ? 0 : 1;
      return decorativePriority(left) - decorativePriority(right);
    });

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

  // This loader is itself released only after interaction plus an idle window.
  // Inject now so a busy page cannot add a second multi-second idle delay.
  inject();
})();
