(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  function loadPixelLibrary() {
    if (n.libraryRequested) return;
    n.libraryRequested = true;
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }

  function schedulePixelLoad() {
    const passiveOnce = { once: true, passive: true };
    f.addEventListener('pointerdown', loadPixelLibrary, passiveOnce);
    f.addEventListener('scroll', loadPixelLibrary, passiveOnce);
    f.addEventListener('keydown', loadPixelLibrary, { once: true });

    const deferPixel = () => f.setTimeout(loadPixelLibrary, 9000);
    if (b.readyState === 'complete') {
      deferPixel();
    } else {
      f.addEventListener('load', deferPixel, { once: true });
    }
  }

  schedulePixelLoad();
})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '1367325403354093');
fbq('track', 'PageView');
