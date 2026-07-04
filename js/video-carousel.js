(() => {
  const carousel = document.querySelector('[data-video-carousel]');
  if (!carousel || carousel.dataset.videoCarouselReady === 'true') return;

  const cards = Array.from(carousel.querySelectorAll('[data-video-card]'));
  const iframe = carousel.querySelector('[data-video-iframe]');
  const frame = carousel.querySelector('.video-frame');
  const titleNode = carousel.querySelector('[data-video-current-title]');
  const prevButton = carousel.querySelector('[data-video-prev]');
  const nextButton = carousel.querySelector('[data-video-next]');
  const dotsNode = carousel.querySelector('[data-video-dots]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse), (max-width: 700px)').matches;
  const excludedVideo = 'KhT4KWHZvEI';

  if (!cards.length || !iframe) return;

  carousel.dataset.videoCarouselReady = 'true';
  carousel.dataset.carouselMode = 'spinning-depth-orbit';
  carousel.dataset.carouselItems = String(cards.length);
  carousel.dataset.zoomVideoExcluded = String(!cards.some((card) => card.dataset.videoId === excludedVideo));
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  frame?.classList.add('is-video-loading');

  let activeIndex = 0;
  let targetSpin = 0;
  let spin = 0;
  let dragSpin = 0;
  let pointerX = 0;
  let pointerY = 0;
  let isInteracting = false;
  let interactionTimer = 0;
  let dragState = null;
  let carouselTapState = null;
  let suppressClickUntil = 0;
  let animationFrame = 0;
  let carouselInView = true;
  let documentVisible = !document.hidden;
  const cardTapStates = new WeakMap();
  let playButton = null;

  const dots = cards.map((card, index) => {
    const dot = document.createElement('button');
    const title = card.dataset.videoTitle || card.textContent.trim() || `video ${index + 1}`;
    dot.type = 'button';
    dot.className = 'video-dot';
    dot.dataset.videoDot = String(index + 1);
    dot.setAttribute('aria-label', `Play ${title}`);
    dot.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    }, { passive: true });
    dot.addEventListener('pointerup', (event) => {
      event.stopPropagation();
    }, { passive: true });
    dot.addEventListener('click', (event) => {
      event.stopPropagation();
      setActive(index, true);
    });
    dotsNode?.appendChild(dot);
    return dot;
  });

  if (frame) {
    playButton = frame.querySelector('[data-video-play]');
    if (!playButton) {
      playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.className = 'video-play-toggle';
      playButton.dataset.videoPlay = 'true';
      playButton.setAttribute('aria-label', 'Play selected video');
      playButton.innerHTML = '<span aria-hidden="true"></span>';
      frame.appendChild(playButton);
    }

    playButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      playActiveVideo();
    });

    if ('MutationObserver' in window) {
      const frameStateObserver = new MutationObserver(() => {
        if (frame.dataset.videoState === 'playing' && !frame.classList.contains('is-video-playing')) {
          frame.classList.add('is-video-playing');
        }
      });
      frameStateObserver.observe(frame, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function normaliseIndex(index) {
    return (index + cards.length) % cards.length;
  }

  function signedOffset(index) {
    const raw = index - activeIndex;
    const half = cards.length / 2;
    if (raw > half) return raw - cards.length;
    if (raw < -half) return raw + cards.length;
    return raw;
  }

  function setInteractionState() {
    isInteracting = true;
    carousel.classList.add('is-interacting');
    window.clearTimeout(interactionTimer);
    interactionTimer = window.setTimeout(() => {
      isInteracting = false;
      carousel.classList.remove('is-interacting');
    }, 3200);
  }

  function syncFramePlaybackState(isPlaying) {
    const state = isPlaying ? 'playing' : 'preview';
    carousel.dataset.videoState = state;
    if (frame) {
      frame.dataset.videoState = state;
      frame.classList.toggle('is-video-playing', isPlaying);
    }
    if (playButton) {
      playButton.hidden = isPlaying;
      playButton.setAttribute('aria-hidden', String(isPlaying));
    }
  }

  function setIframe(videoId, title, options = {}) {
    const isPlaying = Boolean(options.autoplay);
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      enablejsapi: '1',
      playsinline: '1',
      origin: window.location.origin || 'https://taiyzun.com'
    });

    if (isPlaying) {
      params.set('autoplay', '1');
    }

    const nextSrc = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
    if (iframe.src !== nextSrc) {
      frame?.classList.remove('is-video-ready');
      frame?.classList.add('is-video-loading');
      iframe.src = nextSrc;
    }
    syncFramePlaybackState(isPlaying);
    iframe.title = `Taiyzun YouTube video: ${title}`;
    carousel.style.setProperty('--video-preview-image', `url("https://i.ytimg.com/vi/${videoId}/hqdefault.jpg")`);
    if (titleNode) titleNode.textContent = title;
  }

  iframe.addEventListener('load', () => {
    frame?.classList.remove('is-video-loading');
    frame?.classList.add('is-video-ready');
    if (frame?.dataset.videoState === 'playing') {
      frame.classList.add('is-video-playing');
    }
  });

  function playActiveVideo() {
    setActive(activeIndex, true);
  }

  frame?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a, button')) return;
    playActiveVideo();
  });

  function updateCardFacing() {
    cards.forEach((card) => {
      const baseAngle = Number(card.dataset.cardBaseAngle || 0);
      card.style.setProperty('--card-face-angle', `${(-baseAngle - spin - dragSpin).toFixed(3)}deg`);
    });
  }

  function setActive(index, userInitiated = false) {
    activeIndex = normaliseIndex(index);
    const activeCard = cards[activeIndex];
    const videoId = activeCard.dataset.videoId || '';
    const title = activeCard.dataset.videoTitle || activeCard.textContent.trim();

    cards.forEach((card, cardIndex) => {
      const offset = signedOffset(cardIndex);
      const depth = Math.abs(offset);
      const angle = (360 / cards.length) * offset;
      const yLift = offset % 2 === 0 ? -10 : 10;

      const isActive = cardIndex === activeIndex;

      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-pressed', String(isActive));
      if (coarsePointer && !isActive) {
        card.setAttribute('tabindex', '-1');
      } else {
        card.removeAttribute('tabindex');
      }
      card.removeAttribute('aria-hidden');
      card.removeAttribute('inert');
      card.style.setProperty('--card-angle', `${angle.toFixed(3)}deg`);
      card.style.setProperty('--card-counter-angle', `${(-angle).toFixed(3)}deg`);
      card.dataset.cardBaseAngle = angle.toFixed(3);
      card.style.setProperty('--card-opacity', String(Math.max(0.34, 1 - depth * 0.14).toFixed(2)));
      card.style.setProperty('--card-scale', String(Math.max(0.7, 1 - depth * 0.055).toFixed(3)));
      card.style.setProperty('--card-y', `${(yLift * Math.min(depth, 2)).toFixed(2)}px`);
      card.style.setProperty('--card-z', `${(-depth * 18).toFixed(2)}px`);
      card.style.zIndex = String(30 - depth);
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === activeIndex);
      dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
    });

    setIframe(videoId, title, { autoplay: userInitiated });
    updateCardFacing();
    carousel.dataset.activeVideoId = videoId;
    carousel.dataset.activeVideoTitle = title;
    carousel.dataset.zoomVideoExcluded = String(videoId !== excludedVideo && !cards.some((card) => card.dataset.videoId === excludedVideo));

    if (userInitiated) setInteractionState();
  }

  function shouldAnimate() {
    return !reduceMotion && documentVisible && carouselInView;
  }

  function stopAnimationLoop() {
    if (!animationFrame) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function startAnimationLoop() {
    if (animationFrame || !shouldAnimate()) return;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function syncAnimationLoop() {
    if (shouldAnimate()) {
      startAnimationLoop();
    } else {
      stopAnimationLoop();
    }
  }

  function animate() {
    animationFrame = 0;
    if (!shouldAnimate()) return;

    const scrollRatio = window.scrollY / Math.max(window.innerHeight, 1);
    const drift = isInteracting ? 0.018 : 0.05;
    targetSpin += drift;
    const pointerSpin = pointerX * 9;
    const scrollSpin = scrollRatio * 6;
    spin += (targetSpin + pointerSpin + scrollSpin - spin) * 0.045;
    carousel.style.setProperty('--video-spin-angle', `${(spin + dragSpin).toFixed(3)}deg`);
    carousel.style.setProperty('--video-tilt-x', `${(-pointerY * 4.8).toFixed(3)}deg`);
    carousel.style.setProperty('--video-tilt-y', `${(pointerX * 7.2).toFixed(3)}deg`);
    carousel.dataset.spinAngle = (spin + dragSpin).toFixed(2);
    updateCardFacing();

    startAnimationLoop();
  }

  function updatePointer(event) {
    const rect = carousel.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    carousel.style.setProperty('--video-glow-x', `${(((pointerX + 1) / 2) * 100).toFixed(2)}%`);
    carousel.style.setProperty('--video-glow-y', `${(((pointerY + 1) / 2) * 100).toFixed(2)}%`);
  }

  function shouldSkipDragTarget(target) {
    return target instanceof Element && Boolean(target.closest('button, a, iframe, input, select, textarea, label'));
  }

  function shouldSkipCarouselTapTarget(target) {
    return target instanceof Element && Boolean(target.closest('.video-controls, button, a, iframe, input, select, textarea, label'));
  }

  function getCardIndexAtPoint(x, y) {
    const hitCards = cards
      .map((card, index) => {
        const rect = card.getBoundingClientRect();
        const containsPoint = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (!containsPoint) return null;

        return {
          index,
          zIndex: Number(card.style.zIndex || 0),
          distance: Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2))
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.zIndex - a.zIndex || a.distance - b.distance);

    return hitCards[0]?.index ?? -1;
  }

  function endDrag(event) {
    if (!dragState) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaTime = Math.max(event.timeStamp - dragState.startTime, 1);
    const velocity = deltaX / deltaTime;
    const degreesPerCard = 360 / cards.length;
    const projectedDegrees = dragSpin + velocity * 190;
    const steps = Math.max(-3, Math.min(3, Math.round(-projectedDegrees / degreesPerCard)));

    carousel.releasePointerCapture?.(event.pointerId);
    carousel.classList.remove('is-dragging');

    if (Math.abs(deltaX) > 8) {
      suppressClickUntil = Date.now() + 280;
      if (steps !== 0) {
        setActive(activeIndex + steps, true);
      } else {
        setInteractionState();
      }
    }

    dragState = null;
    dragSpin = 0;
    carousel.style.setProperty('--video-drag-angle', '0deg');
  }

  carousel.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (shouldSkipCarouselTapTarget(event.target)) {
      carouselTapState = null;
    } else {
      carouselTapState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY
      };
    }

    if (shouldSkipDragTarget(event.target)) {
      updatePointer(event);
      return;
    }
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      startTime: event.timeStamp
    };
    dragSpin = 0;
    carousel.classList.add('is-dragging');
    carousel.setPointerCapture?.(event.pointerId);
    updatePointer(event);
    setInteractionState();
  }, { passive: true });

  carousel.addEventListener('pointermove', (event) => {
    updatePointer(event);

    if (dragState && event.pointerId === dragState.pointerId) {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragSpin = Math.max(-150, Math.min(150, deltaX * 0.52));
        carousel.style.setProperty('--video-drag-angle', `${dragSpin.toFixed(3)}deg`);
      }
    }
  }, { passive: true });

  carousel.addEventListener('pointerup', endDrag, { passive: true });
  carousel.addEventListener('pointercancel', endDrag, { passive: true });
  carousel.addEventListener('pointercancel', () => {
    carouselTapState = null;
  }, { passive: true });

  carousel.addEventListener('pointerleave', () => {
    if (dragState) return;
    pointerX = 0;
    pointerY = 0;
  });

  cards.forEach((card, index) => {
    card.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      cardTapStates.set(card, {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY
      });
    }, { passive: true });

    card.addEventListener('pointerup', (event) => {
      const tapState = cardTapStates.get(card);
      cardTapStates.delete(card);
      if (!tapState || tapState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - tapState.startX;
      const deltaY = event.clientY - tapState.startY;
      if (Date.now() < suppressClickUntil || Math.hypot(deltaX, deltaY) > 8) return;

      event.stopPropagation();
      suppressClickUntil = Date.now() + 120;
      setActive(index, true);
    }, { passive: true });

    card.addEventListener('pointercancel', () => {
      cardTapStates.delete(card);
    }, { passive: true });

    card.addEventListener('click', (event) => {
      event.stopPropagation();
      if (Date.now() < suppressClickUntil) return;
      setActive(index, true);
    });
  });

  carousel.addEventListener('pointerup', (event) => {
    if (!carouselTapState || carouselTapState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - carouselTapState.startX;
    const deltaY = event.clientY - carouselTapState.startY;
    carouselTapState = null;

    if (Date.now() < suppressClickUntil || Math.hypot(deltaX, deltaY) > 8) return;

    const cardIndex = getCardIndexAtPoint(event.clientX, event.clientY);
    if (cardIndex < 0) return;

    setActive(cardIndex, true);
    suppressClickUntil = Date.now() + 120;
  }, { passive: true });

  [prevButton, nextButton].forEach((button) => {
    button?.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    }, { passive: true });
    button?.addEventListener('pointerup', (event) => {
      event.stopPropagation();
    }, { passive: true });
  });

  prevButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    setActive(activeIndex - 1, true);
  });
  nextButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    setActive(activeIndex + 1, true);
  });

  document.addEventListener('visibilitychange', () => {
    documentVisible = !document.hidden;
    syncAnimationLoop();
  });

  if ('IntersectionObserver' in window) {
    const carouselObserver = new IntersectionObserver((entries) => {
      carouselInView = entries.some((entry) => entry.isIntersecting);
      syncAnimationLoop();
    }, { threshold: 0.04, rootMargin: '360px 0px' });
    carouselObserver.observe(carousel);
  }

  setActive(0, false);
  syncAnimationLoop();
})();
