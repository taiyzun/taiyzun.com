/**
 * THEMES CONFIGURATION
 * Defines color palettes, keywords, and animation parameters for each page
 * Color Strategy: Sophisticated refined base + strategic bold accents
 */

const THEMES_CONFIG = {
  home: {
    name: "Home - Multifaceted Identity",
    keywords: ["multifaceted", "identity", "director", "creator", "peacekeeper"],
    colors: {
      // Base: Refined blues and teals (sophisticated, calm, thoughtful)
      base: {
        background: "#0a0f15", // Deep navy-black
        secondary: "#0d1820", // Slightly lighter navy
        text: "#e8eef5", // Cool off-white
        textSecondary: "rgba(232, 238, 245, 0.65)" // Semi-transparent
      },
      // Accent: Bold prismatic colors (identity facets)
      accents: {
        primary: "#6ba3ff", // Vibrant cool blue
        secondary: "#00d9ff", // Cyan (multifaceted)
        tertiary: "#b84dff", // Magenta accent
        gold: "#ffd700" // Gold highlight for emphasis
      },
      // Gradients for kaleidoscopic effects
      gradients: {
        prismatic: "linear-gradient(135deg, #6ba3ff, #00d9ff, #b84dff, #6ba3ff)",
        shimmer: "linear-gradient(90deg, #ffd700, #00d9ff, #6ba3ff)"
      }
    },
    animation: {
      entrance: "kaleidoscope", // Morphing shapes reveal
      duration: 1200,
      easing: "power2.inOut"
    }
  },

  journey: {
    name: "Journey - Timeline & Growth",
    keywords: ["timeline", "growth", "evolution", "expertise", "career"],
    colors: {
      // Base: Deep jewel tones (sophisticated, professional, flowing)
      base: {
        background: "#0b0f1a", // Deep indigo-black
        secondary: "#0f1429", // Slightly lighter indigo
        text: "#dce4f0", // Cool light gray
        textSecondary: "rgba(220, 228, 240, 0.65)"
      },
      // Accent: Jewel tones and deep purples (growth, richness)
      accents: {
        primary: "#7c5cff", // Deep purple
        secondary: "#1fb8d4", // Teal (flowing, organic)
        tertiary: "#ff6b9d", // Deep pink (achievement)
        gold: "#e8b44a" // Warm gold (milestones)
      },
      // Timeline gradients
      gradients: {
        flow: "linear-gradient(180deg, #7c5cff, #1fb8d4, #ff6b9d)",
        path: "linear-gradient(90deg, #7c5cff, #1fb8d4)"
      }
    },
    animation: {
      entrance: "timeline-reveal", // Timeline draws itself
      duration: 1500,
      easing: "power3.inOut"
    }
  },

  creations: {
    name: "Creations - Artistic & Experimental",
    keywords: ["art", "creative", "experimental", "design", "playful"],
    colors: {
      // Base: Warm neutrals (sophisticated, accessible, artistic)
      base: {
        background: "#120f0a", // Warm dark brown-black
        secondary: "#1a1410", // Slightly lighter warm brown
        text: "#f0ede8", // Warm off-white
        textSecondary: "rgba(240, 237, 232, 0.65)"
      },
      // Accent: Bright, saturated colors (creativity, energy, playfulness)
      accents: {
        primary: "#ff6b5a", // Vibrant coral
        secondary: "#ffa500", // Bright orange
        tertiary: "#ffdb58", // Golden yellow
        quaternary: "#ff1493" // Deep pink (bold accent)
      },
      // Experimental gradients
      gradients: {
        artistic: "linear-gradient(45deg, #ff6b5a, #ffa500, #ffdb58, #ff1493)",
        warm: "linear-gradient(135deg, #ff6b5a, #ffa500)"
      }
    },
    animation: {
      entrance: "drift-rotate", // Items float and rotate
      duration: 1000,
      easing: "sine.inOut"
    }
  },

  odyssey: {
    name: "Odyssey - Poetic Narrative",
    keywords: ["narrative", "story", "transformation", "journey", "peacekeeper"],
    colors: {
      // Base: Warm jewel tones (luxurious, poetic, intimate)
      base: {
        background: "#0f0c0a", // Deep warm black
        secondary: "#1a1410", // Slightly lighter warm
        text: "#f5ede4", // Warm cream
        textSecondary: "rgba(245, 237, 228, 0.65)"
      },
      // Accent: Warm, emotional colors (poetry, transformation, warmth)
      accents: {
        primary: "#d4a574", // Warm bronze
        secondary: "#c97e6d", // Rust/terracotta
        tertiary: "#9b6b4a", // Deep earth brown
        gold: "#f4d03f" // Warm gold (light)
      },
      // Poetic gradients
      gradients: {
        narrative: "linear-gradient(135deg, #d4a574, #c97e6d, #9b6b4a)",
        ink: "linear-gradient(90deg, #d4a574, #c97e6d)"
      }
    },
    animation: {
      entrance: "unfold-reveal", // Text and images reveal poetically
      duration: 2000,
      easing: "power1.inOut"
    }
  },

  connect: {
    name: "Connect - Network & Community",
    keywords: ["connection", "collaboration", "community", "reach", "network"],
    colors: {
      // Base: Warm gold base (inviting, community-centered)
      base: {
        background: "#0f0d0a", // Warm dark charcoal
        secondary: "#161410", // Slightly lighter
        text: "#f0ede8", // Warm off-white
        textSecondary: "rgba(240, 237, 232, 0.65)"
      },
      // Accent: Warm, connective colors (community, warmth, reach)
      accents: {
        primary: "#d4a574", // Warm bronze (primary theme)
        secondary: "#3dd5f3", // Bright cyan (connection lines)
        tertiary: "#6bc34a", // Vibrant green (growth)
        gold: "#ffc107" // Bold gold (nodes)
      },
      // Network gradients
      gradients: {
        network: "linear-gradient(135deg, #d4a574, #3dd5f3, #6bc34a)",
        connection: "linear-gradient(90deg, #3dd5f3, #6bc34a)"
      }
    },
    animation: {
      entrance: "network-activate", // Nodes and connections animate
      duration: 1200,
      easing: "power2.out"
    }
  }
};

/**
 * Get theme by page name
 * @param {string} pageName - Name of the page (home, journey, creations, odyssey, connect)
 * @returns {object} Theme configuration object
 */
function getTheme(pageName) {
  return THEMES_CONFIG[pageName.toLowerCase()] || THEMES_CONFIG.home;
}

/**
 * Apply theme to CSS variables
 * @param {string} pageName - Name of the page
 */
function applyTheme(pageName) {
  const theme = getTheme(pageName);
  const root = document.documentElement;

  // Set base colors
  root.style.setProperty('--theme-bg', theme.colors.base.background);
  root.style.setProperty('--theme-bg-secondary', theme.colors.base.secondary);
  root.style.setProperty('--theme-text', theme.colors.base.text);
  root.style.setProperty('--theme-text-secondary', theme.colors.base.textSecondary);

  // Set accent colors
  root.style.setProperty('--theme-accent-primary', theme.colors.accents.primary);
  root.style.setProperty('--theme-accent-secondary', theme.colors.accents.secondary);
  root.style.setProperty('--theme-accent-tertiary', theme.colors.accents.tertiary);
  root.style.setProperty('--theme-gold', theme.colors.accents.gold);

  // Set gradients
  const gradientKeys = Object.keys(theme.colors.gradients);
  gradientKeys.forEach((key, index) => {
    root.style.setProperty(`--theme-gradient-${index + 1}`, theme.colors.gradients[key]);
  });

  return theme;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { THEMES_CONFIG, getTheme, applyTheme };
}
