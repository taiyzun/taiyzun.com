/**
 * THEME ENGINE
 * Handles dynamic theme application, CSS variable management and theme transitions
 */

class ThemeEngine {
  constructor() {
    this.currentTheme = null;
    this.transitionDuration = 800; // ms for theme transition
    this.initialized = false;
  }

  /**
   * Initialize theme engine and apply initial theme
   * @param {string} initialPage - Page name to initialize with
   */
  init(initialPage = 'home') {
    if (this.initialized) return;

    // Create root CSS variables if they don't exist
    this.ensureRootVariables();

    // Apply initial theme
    this.switchTheme(initialPage, false);

    // Set up page detection and automatic theme switching
    this.setupAutoThemeDetection();

    this.initialized = true;
    console.log('✨ Theme Engine initialized');
  }

  /**
   * Ensure root CSS variables exist with fallback values
   */
  ensureRootVariables() {
    const root = document.documentElement;
    const defaultVars = {
      '--theme-transition-duration': '800ms',
      '--theme-transition-timing': 'cubic-bezier(0.4, 0, 0.2, 1)',
      '--glassmorphism-blur': '10px',
      '--glow-strength': '1',
      '--accent-saturation': '100%'
    };

    Object.entries(defaultVars).forEach(([key, value]) => {
      if (!getComputedStyle(root).getPropertyValue(key)) {
        root.style.setProperty(key, value);
      }
    });
  }

  /**
   * Switch to a new theme with optional transition animation
   * @param {string} pageName - Page name to switch to
   * @param {boolean} animate - Whether to animate the transition (default: true)
   */
  switchTheme(pageName, animate = true) {
    if (!window.THEMES_CONFIG) {
      console.warn('⚠️ THEMES_CONFIG not found. Make sure themes-config.js is loaded.');
      return;
    }

    const theme = THEMES_CONFIG[pageName.toLowerCase()] || THEMES_CONFIG.home;

    if (animate) {
      this.transitionTheme(theme, pageName);
    } else {
      this.applyTheme(theme, pageName);
    }
  }

  /**
   * Apply theme immediately without transition
   * @param {object} theme - Theme configuration object
   * @param {string} pageName - Page name (for logging)
   */
  applyTheme(theme, pageName) {
    const root = document.documentElement;

    // Apply base colors
    root.style.setProperty('--theme-bg', theme.colors.base.background);
    root.style.setProperty('--theme-bg-secondary', theme.colors.base.secondary);
    root.style.setProperty('--theme-text', theme.colors.base.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.base.textSecondary);

    // Apply accent colors
    root.style.setProperty('--theme-accent-primary', theme.colors.accents.primary);
    root.style.setProperty('--theme-accent-secondary', theme.colors.accents.secondary);
    root.style.setProperty('--theme-accent-tertiary', theme.colors.accents.tertiary);
    root.style.setProperty('--theme-gold', theme.colors.accents.gold);

    // Apply gradients
    Object.entries(theme.colors.gradients).forEach(([key, gradient], index) => {
      root.style.setProperty(`--theme-gradient-${index + 1}`, gradient);
    });

    // Update current theme reference
    this.currentTheme = theme;
    this.currentPageName = pageName;

    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme, pageName }
    }));

    console.log(`🎨 Theme applied: ${pageName}`);
  }

  /**
   * Transition to new theme with animation
   * @param {object} theme - Theme configuration object
   * @param {string} pageName - Page name
   */
  transitionTheme(theme, pageName) {
    const root = document.documentElement;

    // Add transition class
    document.body.classList.add('theme-transitioning');

    // Start transition with fade
    gsap.timeline()
      .to(document.body, {
        opacity: 0.8,
        duration: this.transitionDuration / 1000 * 0.5,
        ease: 'power2.inOut'
      }, 0)
      .call(() => {
        // Apply new theme in middle of transition
        this.applyTheme(theme, pageName);
      }, null, this.transitionDuration / 1000 * 0.5)
      .to(document.body, {
        opacity: 1,
        duration: this.transitionDuration / 1000 * 0.5,
        ease: 'power2.inOut'
      }, this.transitionDuration / 1000 * 0.5)
      .call(() => {
        document.body.classList.remove('theme-transitioning');
      });
  }

  /**
   * Detect current page and apply corresponding theme
   */
  detectCurrentPage() {
    // Determine current page from filename or pathname
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
   * Set up automatic theme detection and application
   */
  setupAutoThemeDetection() {
    // Apply theme based on current page
    const currentPage = this.detectCurrentPage();
    this.applyTheme(
      THEMES_CONFIG[currentPage],
      currentPage
    );

    // Listen for navigation events (if using client-side routing)
    window.addEventListener('popstate', () => {
      const newPage = this.detectCurrentPage();
      this.switchTheme(newPage);
    });
  }

  /**
   * Get current theme
   * @returns {object} Current theme object
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get current page name
   * @returns {string} Current page name
   */
  getCurrentPageName() {
    return this.currentPageName;
  }

  /**
   * Update theme transition duration
   * @param {number} duration - Duration in milliseconds
   */
  setTransitionDuration(duration) {
    this.transitionDuration = duration;
    document.documentElement.style.setProperty(
      '--theme-transition-duration',
      `${duration}ms`
    );
  }

  /**
   * Set accent saturation level (for dynamic effects)
   * @param {number} saturation - Saturation percentage (0-200)
   */
  setAccentSaturation(saturation) {
    document.documentElement.style.setProperty(
      '--accent-saturation',
      `${saturation}%`
    );
  }

  /**
   * Set glow strength (for neon/glow effects)
   * @param {number} strength - Strength multiplier (0-2)
   */
  setGlowStrength(strength) {
    document.documentElement.style.setProperty(
      '--glow-strength',
      strength
    );
  }
}

// Create global instance
const themeEngine = new ThemeEngine();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.THEMES_CONFIG) {
      themeEngine.init();
    }
  });
} else {
  if (window.THEMES_CONFIG) {
    themeEngine.init();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeEngine;
}
