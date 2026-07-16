(() => {
  const siteMobileLite = Boolean(window.TAIYZUN_applyMobileLite?.());
  const nav = document.getElementById('mainNav');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger-children').forEach((element) => obs.observe(element));

  const glow = document.getElementById('cursorGlow');
  let glowOn = false;
  let glowFrame = 0;
  let glowX = 0;
  let glowY = 0;
  document.addEventListener('mousemove', (event) => {
    glowX = event.clientX;
    glowY = event.clientY;
    if (!glowOn) {
      glow.classList.add('active');
      glowOn = true;
    }
    if (!glowFrame) {
      glowFrame = requestAnimationFrame(() => {
        glowFrame = 0;
        glow.style.transform = 'translate3d(' + glowX + 'px,' + glowY + 'px,0) translate(-50%,-50%)';
      });
    }
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    glow.classList.remove('active');
    glowOn = false;
  });

  const particleContainer = document.getElementById('particles');
  function spawnParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (10 + Math.random() * 15) + 's';
    particle.style.animationDelay = Math.random() * 3 + 's';
    const size = 1 + Math.random() * 2.5;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particleContainer.appendChild(particle);
    setTimeout(() => {
      particle.remove();
      spawnParticle();
    }, (parseFloat(particle.style.animationDuration) + parseFloat(particle.style.animationDelay)) * 1000);
  }
  if (!siteMobileLite) {
    for (let index = 0; index < 18; index += 1) {
      setTimeout(() => spawnParticle(), index * 300);
    }
  }

  const heroContent = document.querySelector('.hero-content');
  const scrollIndicator = document.querySelector('.scroll-indicator');
  let homeScrollFrame = 0;
  const updateHomeScroll = () => {
    homeScrollFrame = 0;
    const scrollTop = window.scrollY;
    nav.classList.toggle('scrolled', scrollTop > 60);
    const fadeDistance = window.innerHeight * 1.15;
    if (scrollTop < fadeDistance) {
      heroContent.style.transform = 'translateY(' + (scrollTop * 0.16) + 'px)';
      heroContent.style.opacity = Math.max(0.18, 1 - scrollTop / fadeDistance);
      if (scrollIndicator) {
        scrollIndicator.style.opacity = Math.max(0, 1 - scrollTop / (window.innerHeight * 0.95) - 0.25);
      }
    } else {
      heroContent.style.opacity = 0.18;
    }
  };
  window.addEventListener('scroll', () => {
    if (!homeScrollFrame) homeScrollFrame = requestAnimationFrame(updateHomeScroll);
  }, { passive: true });
  updateHomeScroll();
  // Card depth is handled by the shared 3D field to avoid competing pointer transforms.

  const ring = document.getElementById('cursorRing');
  let ringOn = false;
  let ringX = 0;
  let ringY = 0;
  let ringFrame = 0;
  document.addEventListener('mousemove', (event) => {
    if (!ringOn) {
      ring.classList.add('active');
      ringOn = true;
    }
    ringX = event.clientX;
    ringY = event.clientY;
    if (!ringFrame) {
      ringFrame = requestAnimationFrame(() => {
        ringFrame = 0;
        ring.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) translate(-50%,-50%)';
      });
    }
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    ring.classList.remove('active');
    ringOn = false;
  });
  document.querySelectorAll('a, button, .gallery-item, .value-item, .highlight-card').forEach((element) => {
    element.addEventListener('mouseenter', () => ring.classList.add('hovered'));
    element.addEventListener('mouseleave', () => ring.classList.remove('hovered'));
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('mousemove', (event) => {
      const bounds = link.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * 0.28;
      const y = (event.clientY - bounds.top - bounds.height / 2) * 0.28;
      link.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.transform = '';
    });
  });

  document.querySelectorAll('.hero-cta').forEach((button) => {
    button.addEventListener('mousemove', (event) => {
      const bounds = button.getBoundingClientRect();
      const x = (event.clientX - bounds.left - bounds.width / 2) * 0.15;
      const y = (event.clientY - bounds.top - bounds.height / 2) * 0.15;
      button.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
    });
  });

  // Touch ripple + long-press burst.
  (() => {
    const style = document.createElement('style');
    style.textContent = `
      .touch-ripple { position: fixed; border-radius: 50%; pointer-events: none; z-index: 99998; transform: translate(-50%,-50%) scale(0); animation: touchRippleAnim var(--dur,0.6s) cubic-bezier(0.2,0,0,1) forwards; }
      @keyframes touchRippleAnim { 0%{transform:translate(-50%,-50%) scale(0);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:0} }
    `;
    document.head.appendChild(style);
    let pressTimer = null;
    function spawnRipple(x, y, big) {
      const element = document.createElement('div');
      element.className = 'touch-ripple';
      const size = big ? Math.max(window.innerWidth, window.innerHeight) * 2.2 : 120;
      element.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--dur:${big ? 1.1 : 0.55}s;background:radial-gradient(circle,${big ? 'rgba(201,168,76,0.18)' : 'rgba(201,168,76,0.28)'} 0%,transparent 70%);`;
      document.body.appendChild(element);
      setTimeout(() => element.remove(), big ? 1200 : 650);
    }
    document.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      spawnRipple(touch.clientX, touch.clientY, false);
      pressTimer = setTimeout(() => {
        spawnRipple(touch.clientX, touch.clientY, true);
        pressTimer = null;
      }, 500);
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }, { passive: true });
    document.addEventListener('touchmove', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }, { passive: true });
  })();

  const revealAllObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealAllObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal-left, .reveal-right, .reveal-scale').forEach((element) => revealAllObserver.observe(element));

  // Floating particles.
  (() => {
    if (siteMobileLite) return;
    const sections = document.querySelectorAll('.section-bg, section, .about-section, .bio-section');
    sections.forEach((section) => {
      for (let index = 0; index < 5; index += 1) {
        const particle = document.createElement('div');
        particle.className = 'float-particle';
        particle.style.cssText = `left:${Math.random() * 90 + 5}%;bottom:${Math.random() * 20}%;--dur:${8 + Math.random() * 10}s;animation-delay:${Math.random() * 8}s;width:${2 + Math.random() * 3}px;height:${2 + Math.random() * 3}px;`;
        section.style.position = section.style.position || 'relative';
        section.appendChild(particle);
      }
    });
  })();

  // Mouse tracking and cursor glow.
  (() => {
    if (siteMobileLite || document.getElementById('cursorGlow')) return;
    const cursorGlow = document.querySelector('.cursor-glow') || (() => {
      const element = document.createElement('div');
      element.className = 'cursor-glow';
      document.body.appendChild(element);
      return element;
    })();

    let mouseX = 0;
    let mouseY = 0;
    let mouseActive = false;
    let hideTimeout;

    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (!mouseActive) {
        cursorGlow.classList.add('active');
        mouseActive = true;
      }
      cursorGlow.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0) translate(-50%,-50%)';
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        cursorGlow.classList.remove('active');
        mouseActive = false;
      }, 1000);
    });
    document.addEventListener('mouseleave', () => {
      cursorGlow.classList.remove('active');
      mouseActive = false;
    });

    const parallaxElements = document.querySelectorAll('[data-parallax]');
    if (parallaxElements.length) {
      document.addEventListener('mousemove', (event) => {
        window.requestAnimationFrame(() => parallaxElements.forEach((element) => {
          const movementX = (event.clientX / window.innerWidth) * 10;
          const movementY = (event.clientY / window.innerHeight) * 10;
          element.style.transform = `translate(${movementX}px, ${movementY}px)`;
        }));
      });
    }
  })();

  // Smooth scroll offset for the fixed navigation.
  (() => {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((link) => {
      if (link.classList.contains('skip-link')) return;
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (href === '#') {
          event.preventDefault();
          return;
        }
        const target = document.querySelector(href);
        if (target) {
          event.preventDefault();
          const navHeight = document.querySelector('nav')?.offsetHeight || 80;
          const targetPosition = target.offsetTop - navHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      });
    });
  })();

  // Interactive button animations.
  (() => {
    const buttons = document.querySelectorAll('a.hero-cta, button, [role="button"]');
    buttons.forEach((button) => {
      button.addEventListener('mouseenter', function onButtonEnter(event) {
        const bounds = this.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const ripple = document.createElement('span');
        ripple.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 20px;
          height: 20px;
          background: rgba(255,255,255,0.5);
          border-radius: 50%;
          pointer-events: none;
          transform: scale(0);
          animation: rippleExpand 0.6s ease-out;
        `;
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    if (!document.querySelector('style[data-ripple]')) {
      const style = document.createElement('style');
      style.setAttribute('data-ripple', 'true');
      style.textContent = `
        @keyframes rippleExpand {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  })();

  // Intersection observer for reveal animations.
  (() => {
    const revealElements = document.querySelectorAll('[data-reveal]');
    if (!revealElements.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    revealElements.forEach((element) => observer.observe(element));
  })();
})();
