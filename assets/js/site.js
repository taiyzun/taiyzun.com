(() => {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const pageTransitionKey = 'taiyzun-page-transition';

  function injectSkipLink() {
    const main = document.querySelector('main');
    if (!main || document.querySelector('.skip-link')) {
      return;
    }

    if (!main.id) {
      main.id = 'main-content';
    }

    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = `#${main.id}`;
    skip.textContent = 'Skip to content';
    document.body.insertAdjacentElement('afterbegin', skip);
  }

  function optimizeMedia() {
    document.querySelectorAll('img').forEach((img) => {
      if (!img.classList.contains('logo') && !img.closest('.header-logo')) {
        img.loading = img.loading || 'lazy';
        img.decoding = 'async';
      }
    });
  }

  function normalizeExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', [...rel].join(' '));
    });
  }

  function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const header = document.querySelector('header');

    if (!mobileMenuBtn || !header) {
      return;
    }

    const closeMenu = () => {
      header.classList.remove('menu-open');
      document.body.classList.remove('menu-open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    };

    mobileMenuBtn.setAttribute('role', 'button');
    mobileMenuBtn.setAttribute('aria-label', 'Toggle navigation menu');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.tabIndex = 0;

    const toggleMenu = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const willOpen = !header.classList.contains('menu-open');
      header.classList.toggle('menu-open', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
      mobileMenuBtn.setAttribute('aria-expanded', String(willOpen));
    };

    mobileMenuBtn.addEventListener('click', toggleMenu);
    mobileMenuBtn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        toggleMenu(event);
      }
    });

    document.querySelectorAll('nav a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
      if (!header.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  }

  function initBackgroundVideo() {
    const video = document.querySelector('.background-video');

    if (!video) {
      return;
    }

    if (reducedMotionQuery.matches) {
      video.pause();
      video.removeAttribute('autoplay');
      video.setAttribute('poster', 'assets/images/TimEsuiTs-786.png');
    }
  }

  function initGalleryEffects() {
    const galleryGrid = document.querySelector('.gallery-grid');

    if (!galleryGrid || reducedMotionQuery.matches || coarsePointer) {
      return;
    }

    const galleryItems = [...document.querySelectorAll('.gallery-item')];

    galleryGrid.addEventListener('mousemove', (event) => {
      const rect = galleryGrid.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = event.clientX - centerX;
      const mouseY = event.clientY - centerY;

      galleryItems.forEach((item, index) => {
        const intensity = 0.008 + (index * 0.0015);
        item.style.transform = `translate3d(${mouseX * intensity}px, ${mouseY * intensity}px, 0)`;
      });
    });

    galleryGrid.addEventListener('mouseleave', () => {
      galleryItems.forEach((item) => {
        item.style.transform = '';
      });
    });
  }

  function initWowSurfaces() {
    const targets = document.querySelectorAll('main, nav, .socials, .gallery-item, .contact-form, .coming-soon');

    targets.forEach((target) => {
      target.classList.add('wow-surface');

      if (reducedMotionQuery.matches || coarsePointer) {
        return;
      }

      target.addEventListener('pointermove', (event) => {
        const rect = target.getBoundingClientRect();
        const offsetX = (event.clientX - rect.left) / rect.width;
        const offsetY = (event.clientY - rect.top) / rect.height;
        const rotateY = (offsetX - 0.5) * 10;
        const rotateX = (0.5 - offsetY) * 10;

        target.style.setProperty('--rotate-x', `${rotateX.toFixed(2)}deg`);
        target.style.setProperty('--rotate-y', `${rotateY.toFixed(2)}deg`);
        target.style.setProperty('--glow-x', `${(offsetX * 100).toFixed(2)}%`);
        target.style.setProperty('--glow-y', `${(offsetY * 100).toFixed(2)}%`);
      });

      target.addEventListener('pointerleave', () => {
        target.style.setProperty('--rotate-x', '0deg');
        target.style.setProperty('--rotate-y', '0deg');
        target.style.setProperty('--glow-x', '50%');
        target.style.setProperty('--glow-y', '50%');
      });
    });
  }

  function initHeroDepthStack() {
    const main = document.querySelector('body.home-page main');
    if (!main) return;

    const hero = main.querySelector('h1');
    const content = main.querySelector('.home-content');
    if (!hero || !content) return;

    hero.classList.add('hero-layer', 'hero-layer-title');
    content.classList.add('hero-layer', 'hero-layer-content');

    if (reducedMotionQuery.matches || coarsePointer) return;

    main.addEventListener('pointermove', (event) => {
      const rect = main.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      hero.style.transform = `translate3d(${px * 10}px, ${py * 8}px, 68px) rotateY(${px * 5}deg)`;
      content.style.transform = `translate3d(${px * 5}px, ${py * 4}px, 34px) rotateY(${px * 2.5}deg)`;
    });

    main.addEventListener('pointerleave', () => {
      hero.style.transform = '';
      content.style.transform = '';
    });
  }

  function initSceneTransitions() {
    const scenes = document.querySelectorAll('main > *, .gallery-item, .contact-form, .coming-soon');
    scenes.forEach((el) => el.classList.add('scene'));

    if (!('IntersectionObserver' in window) || reducedMotionQuery.matches) {
      scenes.forEach((el) => el.classList.add('scene-in'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scene-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' });

    scenes.forEach((el) => observer.observe(el));
  }

  function initCursorOrbAndMagnetics() {
    if (reducedMotionQuery.matches || coarsePointer) return;

    const orb = document.createElement('div');
    orb.className = 'cursor-orb';
    document.body.appendChild(orb);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let orbX = mouseX;
    let orbY = mouseY;
    const trails = [];
    const maxTrails = 24;

    const canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    const resizeCanvas = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    document.addEventListener('pointermove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      trails.push({ x: mouseX, y: mouseY, life: 1 });
      if (trails.length > maxTrails) trails.shift();
    });

    const magneticLinks = document.querySelectorAll('nav a, .contact-form button, .socials a');
    magneticLinks.forEach((link) => {
      link.classList.add('magnetic');
      link.addEventListener('pointermove', (event) => {
        const rect = link.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        link.style.transform = `translate3d(${x * 0.22}px, ${y * 0.22}px, 0)`;
      });
      link.addEventListener('pointerleave', () => {
        link.style.transform = '';
      });
    });

    const raf = () => {
      orbX += (mouseX - orbX) * 0.18;
      orbY += (mouseY - orbY) * 0.18;
      orb.style.transform = `translate3d(${orbX - 14}px, ${orbY - 14}px, 0)`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = trails.length - 1; i >= 0; i -= 1) {
        const t = trails[i];
        t.life -= 0.03;
        if (t.life <= 0) {
          trails.splice(i, 1);
          continue;
        }
        const r = 2 + (1 - t.life) * 22;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,193,7,${t.life * 0.38})`;
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  function initParticleAura() {
    if (reducedMotionQuery.matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'particle-aura';
    const ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    const particles = [];
    const baseCount = coarsePointer ? 32 : 58;
    let width = 0;
    let height = 0;

    const reset = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      particles.length = 0;
      for (let i = 0; i < baseCount; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: 0.8 + Math.random() * 2.8
        });
      }
    };

    reset();
    window.addEventListener('resize', reset);

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
        g.addColorStop(0, 'rgba(255,193,7,0.25)');
        g.addColorStop(1, 'rgba(255,193,7,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function initPageTransitions() {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);

    const last = sessionStorage.getItem(pageTransitionKey);
    if (last) {
      document.body.classList.add('page-entering');
      requestAnimationFrame(() => {
        document.body.classList.add('page-entered');
        sessionStorage.removeItem(pageTransitionKey);
      });
    }

    document.querySelectorAll('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank') return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      anchor.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        document.body.classList.add('page-leaving');
        sessionStorage.setItem(pageTransitionKey, '1');
        setTimeout(() => {
          window.location.href = url.href;
        }, 240);
      });
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:') {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('js-enhanced');
    injectSkipLink();
    optimizeMedia();
    normalizeExternalLinks();
    initPageTransitions();
    initMobileMenu();
    initBackgroundVideo();
    initParticleAura();
    initCursorOrbAndMagnetics();
    initHeroDepthStack();
    initSceneTransitions();
    initGalleryEffects();
    initWowSurfaces();
  });

  registerServiceWorker();
})();
