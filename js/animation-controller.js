/**
 * ANIMATION CONTROLLER
 * Orchestrates complex animation sequences, page transitions, and scroll-triggered effects
 * Works with ThemeEngine to coordinate smooth theme transitions during navigation
 */

class AnimationController {
  constructor() {
    this.timeline = gsap.timeline();
    this.scrollTriggers = [];
    this.isTransitioning = false;
    this.currentPage = null;
    this.animationDuration = 0.8;
    this.initialized = false;
  }

  /**
   * Initialize animation controller
   */
  init() {
    if (this.initialized) return;

    // Register GSAP ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Listen for theme changes to coordinate animations
    window.addEventListener('themeChanged', (e) => {
      this.onThemeChange(e.detail);
    });

    // Set up Intersection Observer for scroll-triggered animations
    this.setupIntersectionObserver();

    // Detect current page
    this.currentPage = this.detectCurrentPage();

    // Set up navigation click handlers
    this.setupNavigationHandlers();

    this.initialized = true;
    console.log('🎬 Animation Controller initialized');
  }

  /**
   * Detect current page from URL
   * @returns {string} Page name
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';

    let pageName = 'home';
    if (filename.includes('journey')) pageName = 'journey';
    else if (filename.includes('creations')) pageName = 'creations';
    else if (filename.includes('odyssey')) pageName = 'odyssey';
    else if (filename.includes('connect')) pageName = 'connect';

    return pageName;
  }

  /**
   * Set up navigation link click handlers for smooth transitions
   */
  setupNavigationHandlers() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');

      // Check if it's an internal page link
      if (this.isInternalPageLink(href)) {
        e.preventDefault();
        this.navigateToPage(href);
      }
    });
  }

  /**
   * Check if link is an internal page navigation
   * @param {string} href - Link href
   * @returns {boolean}
   */
  isInternalPageLink(href) {
    const internalPages = ['index.html', '/', 'journey.html', 'creations.html', 'odyssey.html', 'connect.html'];
    const baseHref = href.split('#')[0].split('?')[0];
    return internalPages.some(page => baseHref.includes(page) || baseHref === '');
  }

  /**
   * Navigate to a page with animated transition
   * @param {string} href - Target page href
   */
  navigateToPage(href) {
    if (this.isTransitioning) return;

    this.isTransitioning = true;

    // Get target page name
    const targetPage = this.getPageNameFromHref(href);

    // Create transition timeline
    const transitionTL = gsap.timeline({
      onComplete: () => {
        // Navigate to new page
        window.location.href = href;
      }
    });

    // Exit animation for current page
    transitionTL.to(document.body, {
      opacity: 0,
      duration: this.animationDuration * 0.6,
      ease: 'power2.inOut'
    }, 0);

    // Optional: Add theme transition effect
    transitionTL.to(document.documentElement, {
      '--accent-saturation': '120%',
      duration: this.animationDuration * 0.4,
      ease: 'power2.inOut'
    }, 0);

    transitionTL.to(document.documentElement, {
      '--accent-saturation': '100%',
      duration: this.animationDuration * 0.2,
      ease: 'power2.inOut'
    }, this.animationDuration * 0.4);
  }

  /**
   * Get page name from href
   * @param {string} href - Link href
   * @returns {string} Page name
   */
  getPageNameFromHref(href) {
    const cleanHref = href.split('#')[0].split('?')[0];

    if (cleanHref.includes('journey')) return 'journey';
    if (cleanHref.includes('creations')) return 'creations';
    if (cleanHref.includes('odyssey')) return 'odyssey';
    if (cleanHref.includes('connect')) return 'connect';
    return 'home';
  }

  /**
   * Handle theme change - coordinate with animations
   * @param {object} detail - Theme change event detail
   */
  onThemeChange(detail) {
    const { theme, pageName } = detail;

    // Trigger page entrance animation based on theme
    this.playPageEntranceAnimation(pageName, theme);
  }

  /**
   * Play entrance animation for the current page based on its theme
   * @param {string} pageName - Page name
   * @param {object} theme - Theme object
   */
  playPageEntranceAnimation(pageName, theme) {
    const entranceTL = gsap.timeline();

    // Fade in body
    entranceTL.to(document.body, {
      opacity: 1,
      duration: this.animationDuration * 0.5,
      ease: 'power2.out'
    }, 0);

    // Play page-specific entrance animation
    const animationClass = this.getEntranceAnimationClass(pageName);
    const elements = document.querySelectorAll(`.${animationClass}`);

    if (elements.length > 0) {
      elements.forEach((el, index) => {
        entranceTL.to(el, {
          duration: 0.1,
          onStart: () => {
            el.classList.add(animationClass);
          }
        }, index * 0.1);
      });
    }

    // Stagger animations for any stagger-item elements
    const staggerItems = document.querySelectorAll('.stagger-item');
    if (staggerItems.length > 0) {
      entranceTL.to(staggerItems, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      }, 0.2);
    }
  }

  /**
   * Get entrance animation class for page
   * @param {string} pageName - Page name
   * @returns {string} Animation class name
   */
  getEntranceAnimationClass(pageName) {
    const animationMap = {
      home: 'animate-kaleidoscope',
      journey: 'animate-timeline',
      creations: 'animate-drift-rotate',
      odyssey: 'animate-unfold',
      connect: 'animate-network'
    };
    return animationMap[pageName] || 'fade-in';
  }

  /**
   * Set up Intersection Observer for scroll-triggered animations
   */
  setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.playScrollAnimation(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    // Observe all elements with animation-on-scroll class
    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    this.scrollObserver = observer;
  }

  /**
   * Play animation for element entering viewport
   * @param {HTMLElement} element - Element to animate
   */
  playScrollAnimation(element) {
    if (element.classList.contains('animated')) return; // Already animated

    element.classList.add('animated');

    // Detect animation type and play
    if (element.classList.contains('stagger-item')) {
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out'
      });
    } else {
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out'
      });
    }
  }

  /**
   * Create a parallax effect for an element
   * @param {HTMLElement} element - Element to parallax
   * @param {number} speed - Speed multiplier (0.5 = half scroll speed)
   */
  createParallax(element, speed = 0.5) {
    ScrollTrigger.create({
      trigger: element,
      onUpdate: (self) => {
        gsap.to(element, {
          y: self.getVelocity() * speed,
          overwrite: 'auto'
        });
      }
    });
  }

  /**
   * Stagger animation for multiple elements
   * @param {string|HTMLElement[]} selector - CSS selector or array of elements
   * @param {object} animationProps - GSAP animation properties
   * @param {number} staggerAmount - Stagger delay between items
   */
  staggerAnimate(selector, animationProps = {}, staggerAmount = 0.1) {
    const elements = typeof selector === 'string'
      ? document.querySelectorAll(selector)
      : selector;

    return gsap.to(elements, {
      ...animationProps,
      stagger: staggerAmount,
      duration: animationProps.duration || 0.6,
      ease: animationProps.ease || 'power2.out'
    });
  }

  /**
   * Create a reveal animation (clip-path based)
   * @param {HTMLElement} element - Element to reveal
   * @param {string} direction - Direction: 'left', 'right', 'top', 'bottom'
   * @param {number} duration - Animation duration
   */
  revealElement(element, direction = 'left', duration = 0.8) {
    const clipPaths = {
      left: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
      right: ['inset(0 0 0 100%)', 'inset(0 0 0 0)'],
      top: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
      bottom: ['inset(0 0 100% 0)', 'inset(0 0 0 0)']
    };

    gsap.fromTo(element,
      { clipPath: clipPaths[direction][0] },
      {
        clipPath: clipPaths[direction][1],
        duration: duration,
        ease: 'power2.inOut'
      }
    );
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    this.timeline.kill();
    this.scrollTriggers.forEach(trigger => trigger.kill());
  }
}

// Create global instance
const animationController = new AnimationController();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    animationController.init();
  });
} else {
  animationController.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationController;
}
