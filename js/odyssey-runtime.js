(function scheduleOdysseyRuntime() {
  const isCompactOdysseyRuntime = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const compactViewport = window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const constrainedNetwork = Boolean(
      connection &&
      (connection.saveData || /(^|-)2g$|slow-2g/i.test(connection.effectiveType || ''))
    );
    const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
    const mobileAgent = /iP(hone|ad|od)|Android/i.test(navigator.userAgent || '');

    return Boolean(
      window.TAIYZUN_MOBILE_LITE ||
      compactViewport ||
      reduceMotion ||
      constrainedNetwork ||
      lowMemory ||
      mobileAgent
    );
  };

  const runIdle = (callback, timeout) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout });
    } else {
      window.setTimeout(callback, Math.min(timeout, 160));
    }
  };

  const loadPortraitData = () => new Promise((resolve) => {
    if (Array.isArray(window.odysseyPortraits) && window.odysseyPortraits.length) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = '/js/odyssey-portraits.js?v=20260704b';
    script.async = true;
    script.dataset.cfasync = 'false';
    script.fetchPriority = isCompactOdysseyRuntime() ? 'low' : 'auto';
    script.onload = () => {
      const ready = window.TAIYZUN_odysseyPortraitsReady;
      if (ready && typeof ready.then === 'function') ready.then(resolve).catch(resolve);
      else resolve();
    };
    script.onerror = resolve;
    document.head.appendChild(script);
  });

  const start = async () => {
  await loadPortraitData();
  const portraits = window.odysseyPortraits || [];
  const portraitTotal = Number(window.odysseyPortraitTotal) || portraits.length;
  const gallerySizes = '(max-width: 640px) calc((100vw - 72px) / 2), (max-width: 960px) calc((100vw - 104px) / 3), 240px';
  const isMemoryConstrainedGallery = (
    window.TAIYZUN_MOBILE_LITE ||
    window.matchMedia('(max-width: 820px)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    /iP(hone|ad|od)/.test(navigator.userAgent)
  );

  if (isMemoryConstrainedGallery) {
    document.body.classList.add('odyssey-memory-lite');
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function portraitImage(p, size) {
    if ((p.kind === 'optimized' || p.kind === 'responsive') && p.base) {
      if (Array.isArray(p.widths) && p.widths.length) {
        const width = p.widths.reduce((best, candidate) => (
          Math.abs(candidate - size) < Math.abs(best - size) ? candidate : best
        ), p.widths[0]);
        return p.base + '-w' + width + '.webp';
      }
      return p.base + '-w' + size + '.webp';
    }
    return p.src;
  }

  function portraitMarkup(p) {
    const title = escapeHTML(p.title);
    if (p.kind === 'responsive' && p.base && Array.isArray(p.widths) && p.widths.length) {
      const srcset = (format) => p.widths.map(width => p.base + '-w' + width + '.' + format + ' ' + width + 'w').join(', ');
      const fallbackWidth = p.widths[Math.min(1, p.widths.length - 1)];
      const width = Number(p.width) || 400;
      const height = Number(p.height) || 400;
      return '<picture><source srcset="' + srcset('avif') + '" sizes="' + gallerySizes + '" type="image/avif"><source srcset="' + srcset('webp') + '" sizes="' + gallerySizes + '" type="image/webp"><img src="' + p.base + '-w' + fallbackWidth + '.webp" alt="' + title + '" loading="lazy" decoding="async" fetchpriority="low" width="' + width + '" height="' + height + '"></picture>';
    }
    if (p.kind === 'optimized' && p.base) {
      return '<picture><source srcset="' + p.base + '-w400.avif 400w, ' + p.base + '-w800.avif 800w, ' + p.base + '-w1200.avif 1200w" sizes="' + gallerySizes + '" type="image/avif"><source srcset="' + p.base + '-w400.webp 400w, ' + p.base + '-w800.webp 800w, ' + p.base + '-w1200.webp 1200w" sizes="' + gallerySizes + '" type="image/webp"><img src="' + p.base + '-w800.webp" alt="' + title + '" loading="lazy" decoding="async" fetchpriority="low" width="400" height="400"></picture>';
    }
    return '<img src="' + p.src + '" alt="' + title + '" loading="lazy" decoding="async" fetchpriority="low" width="400" height="400">';
  }

  async function ensurePortraitRange(count) {
    if (window.TAIYZUN_ensureOdysseyPortraitRange) {
      await window.TAIYZUN_ensureOdysseyPortraitRange(count);
    }
    return portraits;
  }

  /* ── Gallery grid ── */
  const grid = document.getElementById('galleryGrid');
  const gallerySentinel = document.createElement('div');
  gallerySentinel.className = 'gallery-sentinel';
  gallerySentinel.setAttribute('aria-hidden', 'true');
  const supportsAutoGalleryLoad = isMemoryConstrainedGallery && 'IntersectionObserver' in window;
  const galleryMoreButton = document.createElement('button');
  galleryMoreButton.className = 'gallery-load-more';
  galleryMoreButton.type = 'button';
  galleryMoreButton.textContent = 'Load More Portraits';
  galleryMoreButton.hidden = true;
  grid.after(gallerySentinel);
  gallerySentinel.after(galleryMoreButton);

  let renderedPortraitCount = 0;
  let galleryBatchPending = false;
  let galleryLoadObserver = null;
  let revealObserver = null;
  const initialGalleryBatch = isMemoryConstrainedGallery ? 6 : portraitTotal;
  const galleryBatchSize = isMemoryConstrainedGallery ? 8 : portraitTotal;
  const galleryAutoRootMargin = isMemoryConstrainedGallery ? '120px 0px 220px 0px' : '260px 0px 520px 0px';
  const galleryScrollPreload = isMemoryConstrainedGallery ? 220 : 540;

  function buildGalleryItem(p, i) {
    const el = document.createElement('div');
    el.className = 'gallery-item reveal';
    el.setAttribute('data-index', i);
    el.innerHTML = portraitMarkup(p) + '<div class="overlay"><span class="sparkle">✦</span><h3>' + escapeHTML(p.title) + '</h3><p>' + escapeHTML(p.sub) + '</p></div>';
    el.addEventListener('click', () => {
      el.classList.add('pulse');
      el.addEventListener('animationend', () => el.classList.remove('pulse'), {once: true});
      openLB(parseInt(el.dataset.index, 10));
    });
    if (revealObserver) revealObserver.observe(el);
    return el;
  }

  async function renderPortraitBatch(limit) {
    const end = Math.min(renderedPortraitCount + limit, portraitTotal);
    await ensurePortraitRange(end);
    const fragment = document.createDocumentFragment();
    for (let i = renderedPortraitCount; i < end; i++) {
      if (!portraits[i]) break;
      fragment.appendChild(buildGalleryItem(portraits[i], i));
      renderedPortraitCount = i + 1;
    }
    grid.appendChild(fragment);

    if (renderedPortraitCount >= portraitTotal) {
      if (galleryLoadObserver) galleryLoadObserver.disconnect();
      gallerySentinel.remove();
      galleryMoreButton.remove();
    } else if (isMemoryConstrainedGallery) {
      galleryMoreButton.hidden = supportsAutoGalleryLoad;
    }
  }

  function schedulePortraitBatch() {
    if (galleryBatchPending || renderedPortraitCount >= portraitTotal) return;
    galleryBatchPending = true;
    const run = async () => {
      try {
        await renderPortraitBatch(galleryBatchSize);
      } finally {
        galleryBatchPending = false;
      }
    };
    runIdle(run, isMemoryConstrainedGallery ? 1800 : 1200);
  }

  galleryBatchPending = true;
  renderPortraitBatch(initialGalleryBatch).finally(() => {
    galleryBatchPending = false;
  });
  galleryMoreButton.addEventListener('click', schedulePortraitBatch);

  if (renderedPortraitCount < portraitTotal) {
    if ('IntersectionObserver' in window) {
      galleryLoadObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) schedulePortraitBatch();
      }, {rootMargin: galleryAutoRootMargin, threshold: 0});
      galleryLoadObserver.observe(gallerySentinel);
    } else {
      (async () => {
        while (renderedPortraitCount < portraitTotal) await renderPortraitBatch(galleryBatchSize);
      })();
    }

    window.addEventListener('scroll', () => {
      if (!gallerySentinel.isConnected) return;
      const rect = gallerySentinel.getBoundingClientRect();
      if (rect.top - window.innerHeight < galleryScrollPreload) schedulePortraitBatch();
    }, {passive: true});
  }

  /* ── Lightbox elements ── */
  const lb            = document.getElementById('lightbox');
  const lbImg         = document.getElementById('lbImg');
  const lbTitle       = document.getElementById('lbTitle');
  const lbSub         = document.getElementById('lbSub');
  const lbCurrent     = document.getElementById('lbCurrent');
  const lbTotal       = document.getElementById('lbTotal');
  const lbMeta        = document.getElementById('lbMeta');
  const lbProgressBar = document.getElementById('lbProgressBar');
  const lbFilmstrip   = document.getElementById('lbFilmstrip');
  const lbPrevBtn     = document.getElementById('lbPrev');
  const lbNextBtn     = document.getElementById('lbNext');
  const lbClose       = document.getElementById('lbClose');
  const lbImgWrap     = document.getElementById('lbImgWrap');

  let currentIdx = 0, isTransitioning = false, isZoomed = false;
  let filmstripBuilt = false;
  let lightboxGestures = null;

  lbTotal.textContent = portraitTotal;
  const portraitCount = document.getElementById('portraitCount');
  if (portraitCount) portraitCount.textContent = portraitTotal;

  function buildFilmstrip() {
    if (filmstripBuilt || isMemoryConstrainedGallery) return;
    const fragment = document.createDocumentFragment();
    portraits.forEach((p, i) => {
      const thumb = document.createElement('img');
      thumb.className = 'lb-thumb';
      thumb.src = p.thumb || portraitImage(p, 400);
      thumb.alt = p.title;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.addEventListener('click', () => { if (i !== currentIdx) navigate(i, i > currentIdx ? 'next' : 'prev'); });
      fragment.appendChild(thumb);
    });
    lbFilmstrip.appendChild(fragment);
    filmstripBuilt = true;
  }

  function updateFilmstrip() {
    if (!filmstripBuilt) return;
    const thumbs = lbFilmstrip.querySelectorAll('.lb-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIdx));
    const active = thumbs[currentIdx];
    if (active) active.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
  }

  function updateProgress() {
    lbProgressBar.style.width = ((currentIdx + 1) / portraitTotal * 100) + '%';
  }

  function createLightboxGestureController({ wrap, image, previous, next, onZoomChange }) {
    const MAX_SCALE = 4;
    const DOUBLE_TAP_MS = 280;
    const TAP_MOVE_PX = 14;
    const SWIPE_PX = 48;
    const state = {
      scale: 1,
      x: 0,
      y: 0,
      startScale: 1,
      startX: 0,
      startY: 0,
      startDistance: 0,
      startMid: null,
      touchStart: null,
      dragging: false,
      pinching: false,
      pointerStart: null,
      lastTapAt: 0,
      lastTapX: 0,
      lastTapY: 0
    };
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const isActiveZoom = () => state.scale > 1.01;
    const setZoomState = (zoomed) => { if (onZoomChange) onZoomChange(zoomed); };
    const relativePoint = (clientX, clientY) => {
      const rect = wrap.getBoundingClientRect();
      return {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2
      };
    };
    const distance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
    const midpoint = (touches) => relativePoint(
      (touches[0].clientX + touches[1].clientX) / 2,
      (touches[0].clientY + touches[1].clientY) / 2
    );
    function clampPan() {
      if (!isActiveZoom()) {
        state.scale = 1;
        state.x = 0;
        state.y = 0;
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(image.offsetWidth || rect.width, 1);
      const height = Math.max(image.offsetHeight || rect.height, 1);
      const maxX = Math.max(0, (width * state.scale - rect.width) / 2);
      const maxY = Math.max(0, (height * state.scale - rect.height) / 2);
      state.x = clamp(state.x, -maxX, maxX);
      state.y = clamp(state.y, -maxY, maxY);
    }
    function apply({ animate = true } = {}) {
      clampPan();
      const zoomed = isActiveZoom();
      wrap.classList.toggle('is-zoomed', zoomed);
      image.classList.toggle('zoomed', zoomed);
      wrap.dataset.zoomScale = zoomed ? state.scale.toFixed(2) : '1.00';
      setZoomState(zoomed);
      if (!zoomed) {
        image.style.transform = '';
        image.style.transition = '';
        wrap.classList.remove('is-dragging', 'is-pinching');
        return;
      }
      image.style.transition = animate ? 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
      image.style.transform = `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0) scale(${state.scale.toFixed(4)})`;
    }
    function reset() {
      state.scale = 1;
      state.x = 0;
      state.y = 0;
      state.touchStart = null;
      state.dragging = false;
      state.pinching = false;
      state.pointerStart = null;
      wrap.classList.remove('is-zoomed', 'is-dragging', 'is-pinching');
      wrap.dataset.zoomScale = '1.00';
      image.classList.remove('zoomed');
      image.style.transform = '';
      image.style.transition = '';
      setZoomState(false);
    }
    function zoomAt(nextScale, clientX, clientY, animate = true) {
      const oldScale = Math.max(state.scale, 1);
      const target = clamp(nextScale, 1, MAX_SCALE);
      if (target <= 1.01) {
        reset();
        return;
      }
      const point = relativePoint(clientX, clientY);
      const ratio = target / oldScale;
      state.x = point.x - (point.x - state.x) * ratio;
      state.y = point.y - (point.y - state.y) * ratio;
      state.scale = target;
      apply({ animate });
    }
    function toggleZoom(clientX, clientY) {
      zoomAt(isActiveZoom() ? 1 : 2.6, clientX, clientY, true);
    }
    function rememberTouchStart(touch) {
      state.touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        panX: state.x,
        panY: state.y,
        time: Date.now()
      };
    }
    function handleTap(touch, event) {
      if (!state.touchStart) return false;
      const moved = Math.hypot(touch.clientX - state.touchStart.x, touch.clientY - state.touchStart.y);
      if (moved > TAP_MOVE_PX) {
        state.lastTapAt = 0;
        return false;
      }
      const now = Date.now();
      const nearLastTap = Math.hypot(touch.clientX - state.lastTapX, touch.clientY - state.lastTapY) < 36;
      if (now - state.lastTapAt < DOUBLE_TAP_MS && nearLastTap) {
        event.preventDefault();
        state.lastTapAt = 0;
        toggleZoom(touch.clientX, touch.clientY);
        return true;
      }
      state.lastTapAt = now;
      state.lastTapX = touch.clientX;
      state.lastTapY = touch.clientY;
      return false;
    }
    wrap.addEventListener('touchstart', event => {
      if (event.touches.length === 2) {
        event.preventDefault();
        state.pinching = true;
        state.dragging = false;
        state.startScale = state.scale;
        state.startX = state.x;
        state.startY = state.y;
        state.startDistance = Math.max(distance(event.touches), 1);
        state.startMid = midpoint(event.touches);
        wrap.classList.add('is-pinching');
        wrap.classList.remove('is-dragging');
        return;
      }
      if (event.touches.length === 1) {
        rememberTouchStart(event.touches[0]);
        state.dragging = isActiveZoom();
        wrap.classList.toggle('is-dragging', state.dragging);
      }
    }, { passive: false });
    wrap.addEventListener('touchmove', event => {
      if (event.touches.length === 2) {
        event.preventDefault();
        if (!state.pinching) {
          state.pinching = true;
          state.startScale = state.scale;
          state.startX = state.x;
          state.startY = state.y;
          state.startDistance = Math.max(distance(event.touches), 1);
          state.startMid = midpoint(event.touches);
          wrap.classList.add('is-pinching');
        }
        const mid = midpoint(event.touches);
        const nextScale = clamp(state.startScale * (distance(event.touches) / state.startDistance), 1, MAX_SCALE);
        const ratio = nextScale / Math.max(state.startScale, 1);
        state.scale = nextScale;
        state.x = mid.x - (state.startMid.x - state.startX) * ratio;
        state.y = mid.y - (state.startMid.y - state.startY) * ratio;
        apply({ animate: false });
        return;
      }
      if (event.touches.length === 1 && isActiveZoom()) {
        event.preventDefault();
        if (!state.touchStart) rememberTouchStart(event.touches[0]);
        state.dragging = true;
        wrap.classList.add('is-dragging');
        state.x = state.touchStart.panX + event.touches[0].clientX - state.touchStart.x;
        state.y = state.touchStart.panY + event.touches[0].clientY - state.touchStart.y;
        apply({ animate: false });
      }
    }, { passive: false });
    wrap.addEventListener('touchend', event => {
      const touch = event.changedTouches[0];
      if (state.pinching) {
        event.preventDefault();
        state.pinching = false;
        wrap.classList.remove('is-pinching');
        if (event.touches.length === 1) {
          rememberTouchStart(event.touches[0]);
          state.dragging = isActiveZoom();
          wrap.classList.toggle('is-dragging', state.dragging);
        } else {
          state.dragging = false;
          wrap.classList.remove('is-dragging');
          apply({ animate: true });
        }
        return;
      }
      const usedTap = touch ? handleTap(touch, event) : false;
      if (isActiveZoom()) {
        state.dragging = false;
        wrap.classList.remove('is-dragging');
        if (!usedTap) apply({ animate: true });
        return;
      }
      if (!usedTap && touch && state.touchStart) {
        const dx = state.touchStart.x - touch.clientX;
        const dy = state.touchStart.y - touch.clientY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_PX) {
          event.preventDefault();
          if (dx > 0) next();
          else previous();
        }
      }
    }, { passive: false });
    wrap.addEventListener('touchcancel', () => {
      state.dragging = false;
      state.pinching = false;
      state.touchStart = null;
      wrap.classList.remove('is-dragging', 'is-pinching');
      apply({ animate: true });
    });
    wrap.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      toggleZoom(event.clientX, event.clientY);
    });
    wrap.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || !isActiveZoom()) return;
      event.preventDefault();
      state.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: state.x, panY: state.y };
      state.dragging = true;
      wrap.classList.add('is-dragging');
      wrap.setPointerCapture?.(event.pointerId);
    });
    wrap.addEventListener('pointermove', event => {
      if (!state.pointerStart || state.pointerStart.id !== event.pointerId || !isActiveZoom()) return;
      event.preventDefault();
      state.x = state.pointerStart.panX + event.clientX - state.pointerStart.x;
      state.y = state.pointerStart.panY + event.clientY - state.pointerStart.y;
      apply({ animate: false });
    });
    const endPointer = event => {
      if (!state.pointerStart || state.pointerStart.id !== event.pointerId) return;
      state.pointerStart = null;
      state.dragging = false;
      wrap.classList.remove('is-dragging');
      apply({ animate: true });
    };
    wrap.addEventListener('pointerup', endPointer);
    wrap.addEventListener('pointercancel', endPointer);
    image.addEventListener('dragstart', event => event.preventDefault());
    return { reset, isZoomed: isActiveZoom };
  }

  function animateImg(direction) {
    lbImg.classList.remove('lb-anim-enter','lb-anim-next','lb-anim-prev');
    void lbImg.offsetWidth;
    if (direction === 'open') lbImg.classList.add('lb-anim-enter');
    else if (direction === 'next') lbImg.classList.add('lb-anim-next');
    else lbImg.classList.add('lb-anim-prev');
  }

  async function loadImage(i, direction) {
    if (isTransitioning) return;
    isTransitioning = true;
    isZoomed = false;
    lightboxGestures?.reset();
    currentIdx = ((i % portraitTotal) + portraitTotal) % portraitTotal;
    await ensurePortraitRange(currentIdx + 1);
    const portrait = portraits[currentIdx];
    if (!portrait) {
      isTransitioning = false;
      return;
    }
    lbImg.onerror = null;
    lbImg.src = portrait.full || portraitImage(portrait, 1200);
    lbImg.alt = portrait.title;
    lbTitle.textContent = portrait.title;
    lbSub.textContent = portrait.sub;
    lbCurrent.textContent = currentIdx + 1;
    lbMeta.textContent = portrait.sub;
    updateProgress();
    updateFilmstrip();
    animateImg(direction);
    setTimeout(() => { isTransitioning = false; }, 420);
  }

  function openLB(i) {
    if (lb.classList.contains('open')) return;
    if (!lightboxGestures) {
      lightboxGestures = createLightboxGestureController({
        wrap: lbImgWrap,
        image: lbImg,
        previous: prevImage,
        next: nextImage,
        onZoomChange: zoomed => { isZoomed = zoomed; }
      });
    }
    buildFilmstrip();
    loadImage(i, 'open');
    lb.classList.add('open');
    document.documentElement.classList.add('tai-lightbox-open');
    document.body.classList.add('tai-lightbox-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLB() {
    lightboxGestures?.reset();
    isZoomed = false;
    lb.classList.remove('open');
    document.documentElement.classList.remove('tai-lightbox-open');
    document.body.classList.remove('tai-lightbox-open');
    document.body.style.overflow = '';
  }

  function navigate(i, direction) { loadImage(i, direction); }
  function prevImage() { navigate((currentIdx - 1 + portraitTotal) % portraitTotal, 'prev'); }
  function nextImage() { navigate((currentIdx + 1) % portraitTotal, 'next'); }

  /* ── Controls ── */
  lbClose.addEventListener('click', closeLB);
  lbPrevBtn.addEventListener('click', prevImage);
  lbNextBtn.addEventListener('click', nextImage);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });

  /* ── Keyboard ── */
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLB(); }
    if (e.key === 'ArrowLeft'  && !isZoomed) { e.preventDefault(); prevImage(); }
    if (e.key === 'ArrowRight' && !isZoomed) { e.preventDefault(); nextImage(); }
    if (e.key === ' '          && !isZoomed) { e.preventDefault(); nextImage(); }
  });

  /* ── Preload adjacent images ── */
  lbImg.addEventListener('load', () => {
    const preload = async (idx) => {
      await ensurePortraitRange(idx + 1);
      if (!portraits[idx]) return;
      const img = new Image();
      img.src = portraits[idx].full || portraitImage(portraits[idx], 1200);
    };
    if (isMemoryConstrainedGallery) {
      const run = () => preload((currentIdx + 1) % portraitTotal);
      if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1600 });
      else window.setTimeout(run, 360);
      return;
    }
    preload((currentIdx + 1) % portraitTotal);
    preload((currentIdx - 1 + portraitTotal) % portraitTotal);
  });

  /* ── Nav scroll ── */
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60), { passive: true });

  /* ── Reveal on scroll ── */
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, {threshold: 0.05, rootMargin: '0px 0px -20px 0px'});
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ── Cursor glow ── */
  const glow = document.getElementById('cursorGlow');
  let glowOn = false;
  if (!isMemoryConstrainedGallery && glow) {
    document.addEventListener('mousemove', (e) => {
      if (!glowOn) { glow.classList.add('active'); glowOn = true; }
      requestAnimationFrame(() => { glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)'; });
    });
    document.addEventListener('mouseleave', () => { glow.classList.remove('active'); glowOn = false; });
  }

  /* ── Service worker ── */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');

  /* ── Mobile nav ── */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open'); hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }));
  // ── Touch ripple + long-press burst ──
  (function(){
    if (isMemoryConstrainedGallery || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const style = document.createElement('style');
    style.textContent = `.touch-ripple{position:fixed;border-radius:50%;pointer-events:none;z-index:99998;transform:translate(-50%,-50%) scale(0);animation:touchRippleAnim var(--dur,0.6s) cubic-bezier(0.2,0,0,1) forwards;}@keyframes touchRippleAnim{0%{transform:translate(-50%,-50%) scale(0);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}`;
    document.head.appendChild(style);
    let pressTimer=null;
    function spawnRipple(x,y,big){const el=document.createElement('div');el.className='touch-ripple';const size=big?Math.max(window.innerWidth,window.innerHeight)*2.2:120;el.style.cssText=`left:${x}px;top:${y}px;width:${size}px;height:${size}px;--dur:${big?1.1:0.55}s;background:radial-gradient(circle,${big?'rgba(201,168,76,0.18)':'rgba(201,168,76,0.28)'} 0%,transparent 70%);`;document.body.appendChild(el);setTimeout(()=>el.remove(),big?1200:650);}
    document.addEventListener('touchstart',e=>{const t=e.touches[0];spawnRipple(t.clientX,t.clientY,false);pressTimer=setTimeout(()=>{spawnRipple(t.clientX,t.clientY,true);pressTimer=null;},500);},{passive:true});
    document.addEventListener('touchend',()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}},{passive:true});
    document.addEventListener('touchmove',()=>{if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}},{passive:true});
  })();
  // ── Enhanced reveal observer ──
  const revealAllObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealAllObs.unobserve(e.target); } });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal-left, .reveal-right, .reveal-scale').forEach(el => revealAllObs.observe(el));
  // ── Floating particles ──
  (function(){
    if (isMemoryConstrainedGallery) return;
    document.querySelectorAll('section, .gallery-section, .page-hero, footer').forEach(sec => {
      for (let i = 0; i < 4; i++) {
        const p = document.createElement('div');
        p.className = 'float-particle';
        p.style.cssText = `left:${Math.random()*90+5}%;bottom:${Math.random()*20}%;--dur:${8+Math.random()*10}s;animation-delay:${Math.random()*8}s;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;`;
        if (!sec.style.position) sec.style.position = 'relative';
        sec.appendChild(p);
      }
    });
  })();
  };

  let runtimeStarted = false;
  let runtimeTimer = 0;
  let runtimeDueAt = Infinity;
  const scheduleRuntimeStart = (delay, timeout) => {
    const dueAt = Date.now() + delay;
    if (runtimeStarted || dueAt >= runtimeDueAt) return;
    if (runtimeTimer) window.clearTimeout(runtimeTimer);
    runtimeDueAt = dueAt;
    runtimeTimer = window.setTimeout(() => {
      runtimeTimer = 0;
      runtimeDueAt = Infinity;
      if (runtimeStarted) return;
      runtimeStarted = true;
      runIdle(start, timeout);
    }, delay);
  };

  const runWhenReady = () => {
    const compactRuntime = isCompactOdysseyRuntime();
    scheduleRuntimeStart(compactRuntime ? 3800 : 450, compactRuntime ? 3600 : 1200);

    if (!compactRuntime) return;

    const promptStart = () => scheduleRuntimeStart(650, 1800);
    window.addEventListener('pointerdown', promptStart, { once: true, passive: true });
    window.addEventListener('touchstart', promptStart, { once: true, passive: true });
    window.addEventListener('wheel', promptStart, { once: true, passive: true });
    window.addEventListener('scroll', promptStart, { once: true, passive: true });
    window.addEventListener('keydown', promptStart, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runWhenReady, { once: true });
  } else {
    runWhenReady();
  }
})();
