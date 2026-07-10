(() => {
  const currentScript = document.currentScript;
  const compactDefer = currentScript?.dataset?.compactDefer === 'true';

  function shouldDeferCompactExperience() {
    return Boolean(
      compactDefer &&
      (
        window.TAIYZUN_MOBILE_LITE ||
        window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches
      )
    );
  }

  function runWhenIdle(callback, timeout) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
    } else {
      window.setTimeout(callback, Math.min(timeout, 320));
    }
  }

  function scheduleCompactExperience(callback) {
    let scheduled = false;
    const start = (delay, timeout) => {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(() => runWhenIdle(callback, timeout), delay);
    };
    const promptStart = () => start(280, 1600);
    const passiveOnce = { once: true, passive: true };

    window.addEventListener('pointerdown', promptStart, passiveOnce);
    window.addEventListener('touchstart', promptStart, passiveOnce);
    window.addEventListener('wheel', promptStart, passiveOnce);
    window.addEventListener('scroll', promptStart, passiveOnce);
    window.addEventListener('keydown', promptStart, { once: true });

    const settledStart = () => start(2600, 4200);
    if (document.readyState === 'complete') {
      settledStart();
    } else {
      window.addEventListener('load', settledStart, { once: true });
    }
  }

  if (shouldDeferCompactExperience()) {
    scheduleCompactExperience(initPremiumExperience);
    return;
  }

  initPremiumExperience();

  function initPremiumExperience() {
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;

  if (!body || body.dataset.premiumExperience === 'true') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  body.dataset.premiumExperience = 'true';
  root.classList.add('premium-ui');
  body.classList.add('premium-ui-ready');

  const nav = doc.getElementById('mainNav');
  const updateNav = () => {
    if (!nav) return;
    nav.classList.toggle('premium-nav-scrolled', window.scrollY > 12);
  };

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  const sectionSelector = [
    '.hero', '.page-hero', '.section-bg', '.timeline-section', '.gallery-section',
    '.connect-section', '.social-section', 'footer', 'main#main-content'
  ].join(',');

  doc.querySelectorAll(sectionSelector).forEach((section) => {
    if (!section.querySelector(':scope > .premium-section-line')) {
      const line = doc.createElement('span');
      line.className = 'premium-section-line';
      line.setAttribute('aria-hidden', 'true');
      section.insertBefore(line, section.firstChild);
    }
  });

  const revealSelector = [
    '.hero-content', '.page-hero-content', '.about-grid', '.highlight-card', '.thesis-card',
    '.value-item', '.bio-section', '.timeline-category', '.timeline-item', '.gallery-label',
    '.cat-filters', '.art-grid', '.connect-label', '.contact-form', '.social-card', '.info-card',
    '.video-field-shell'
  ].join(',');

  const revealNodes = Array.from(doc.querySelectorAll(revealSelector));
  revealNodes.forEach((node, index) => {
    node.classList.add('premium-reveal');
    node.style.setProperty('--premium-order', String(Math.min(index % 9, 8)));
    if (index < 2 || node.classList.contains('hero-content') || node.classList.contains('page-hero-content')) {
      node.dataset.premiumImmediate = 'true';
    }
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-premium-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealNodes.forEach((node) => revealObserver.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-premium-visible'));
  }

  const markImage = (image) => {
    if (!image || image.dataset.premiumImage === 'true') return;
    if (image.closest('.taiyzun-sword-stage')) return;
    image.dataset.premiumImage = 'true';
    image.classList.add('premium-image');

    const loaded = () => image.classList.add('is-premium-loaded');
    if (image.complete && image.naturalWidth > 0) {
      loaded();
    } else {
      image.addEventListener('load', loaded, { once: true });
      image.addEventListener('error', loaded, { once: true });
    }
  };

  doc.querySelectorAll('img').forEach(markImage);

  if ('MutationObserver' in window) {
    const imageObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.('img')) markImage(node);
          node.querySelectorAll?.('img').forEach(markImage);
        });
      });
    });
    imageObserver.observe(body, { childList: true, subtree: true });
  }

  if (!reduceMotion && pointerFine) {
    const tiltSelector = [
      '.highlight-card', '.thesis-card', '.value-item', '.timeline-item',
      '.social-card', '.info-card', '.art-item', '.gallery-item'
    ].join(',');

    doc.querySelectorAll(tiltSelector).forEach((node) => {
      let raf = 0;
      let pendingEvent = null;

      const updateTilt = () => {
        raf = 0;
        if (!pendingEvent) return;
        const rect = node.getBoundingClientRect();
        const x = ((pendingEvent.clientX - rect.left) / Math.max(rect.width, 1)) - 0.5;
        const y = ((pendingEvent.clientY - rect.top) / Math.max(rect.height, 1)) - 0.5;
        node.style.setProperty('--premium-tilt-x', `${(x * 3.2).toFixed(2)}deg`);
        node.style.setProperty('--premium-tilt-y', `${(y * -3.2).toFixed(2)}deg`);
      };

      node.addEventListener('pointermove', (event) => {
        pendingEvent = event;
        if (!raf) raf = window.requestAnimationFrame(updateTilt);
      }, { passive: true });

      node.addEventListener('pointerleave', () => {
        pendingEvent = null;
        node.style.setProperty('--premium-tilt-x', '0deg');
        node.style.setProperty('--premium-tilt-y', '0deg');
      }, { passive: true });
    });
  }

  if (!reduceMotion) {
    let scrollRaf = 0;
    const updateScroll = () => {
      scrollRaf = 0;
      const max = Math.max(doc.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / max));
      root.style.setProperty('--premium-scroll', progress.toFixed(4));
    };

    const requestScroll = () => {
      if (!scrollRaf) scrollRaf = window.requestAnimationFrame(updateScroll);
    };

    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll, { passive: true });
    updateScroll();
  } else {
    revealNodes.forEach((node) => node.classList.add('is-premium-visible'));
  }
  }
})();
