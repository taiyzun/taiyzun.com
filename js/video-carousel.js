(() => {
  const carousel = document.querySelector('[data-video-carousel]');
  if (!carousel || carousel.dataset.videoCarouselReady === 'true') return;

  const cards = Array.from(carousel.querySelectorAll('[data-video-card]'));
  const iframe = carousel.querySelector('[data-video-iframe]');
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

  let activeIndex = 0;
  let targetSpin = 0;
  let spin = 0;
  let dragSpin = 0;
  let pointerX = 0;
  let pointerY = 0;
  let isInteracting = false;
  let interactionTimer = 0;
  let dragState = null;
  let suppressClickUntil = 0;

  const dots = cards.map((card, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'video-dot';
    dot.setAttribute('aria-label', `Show video ${index + 1}`);
    dot.addEventListener('click', () => setActive(index, true));
    dotsNode?.appendChild(dot);
    return dot;
  });

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

  function setIframe(videoId, title) {
    const nextSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
    if (iframe.src !== nextSrc) iframe.src = nextSrc;
    iframe.title = `Taiyzun YouTube video: ${title}`;
    carousel.style.setProperty('--video-preview-image', `url("https://i.ytimg.com/vi/${videoId}/hqdefault.jpg")`);
    if (titleNode) titleNode.textContent = title;
  }

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
        card.setAttribute('aria-hidden', 'true');
        card.setAttribute('inert', '');
      } else {
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-hidden');
        card.removeAttribute('inert');
      }
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

    setIframe(videoId, title);
    updateCardFacing();
    carousel.dataset.activeVideoId = videoId;
    carousel.dataset.activeVideoTitle = title;
    carousel.dataset.zoomVideoExcluded = String(videoId !== excludedVideo && !cards.some((card) => card.dataset.videoId === excludedVideo));

    if (userInitiated) setInteractionState();
  }

  function animate() {
    if (!reduceMotion) {
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
    }

    window.requestAnimationFrame(animate);
  }

  function updatePointer(event) {
    const rect = carousel.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    carousel.style.setProperty('--video-glow-x', `${(((pointerX + 1) / 2) * 100).toFixed(2)}%`);
    carousel.style.setProperty('--video-glow-y', `${(((pointerY + 1) / 2) * 100).toFixed(2)}%`);
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

  carousel.addEventListener('pointerleave', () => {
    if (dragState) return;
    pointerX = 0;
    pointerY = 0;
  });

  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      if (Date.now() < suppressClickUntil) return;
      setActive(index, true);
    });
  });

  prevButton?.addEventListener('click', () => setActive(activeIndex - 1, true));
  nextButton?.addEventListener('click', () => setActive(activeIndex + 1, true));

  setActive(0, false);
  window.requestAnimationFrame(animate);
})();
