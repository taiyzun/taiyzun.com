(() => {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

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

    if (!galleryGrid || reducedMotionQuery.matches || window.matchMedia('(pointer: coarse)').matches) {
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

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:') {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initBackgroundVideo();
    initGalleryEffects();
  });

  registerServiceWorker();
})();
