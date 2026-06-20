(() => {
  const body = document.body;

  if (!body) {
    return;
  }

  const decorativeAssets = [
    "assets/decorative/8 ~ ball ~ c ~ liberTy [2000x3000].png",
    "assets/decorative/@TZ 4233 001 [786x786].png",
    "assets/decorative/@TZ 4233 TSb [786x786].png",
    "assets/decorative/@TZ 4233 [786x786].png",
    "assets/decorative/@TZ breaThain 0002 7o6 [928x3303].png",
    "assets/decorative/@TZ breaThain 0004 STing [1666x2258].png",
    "assets/decorative/@TZ breaThain 0005 layer 20 [2720x1869].png",
    "assets/decorative/@TZ breaThain 0007 layer 12 [3713x3838].png",
    "assets/decorative/@TZ breaThain 0008 layer 22 [1983x1589].png",
    "assets/decorative/@TZ breaThain 0009 layer 21 [3322x2728].png",
    "assets/decorative/@TZ breaThain 0011 infiniTe hEarTS [8183x1527].png",
    "assets/decorative/@TZ breaThain 0012 namESiS [1765x1515].png",
    "assets/decorative/@TZ breaThain 0013 Smile iTS mE Sword [1945x2374].png",
    "assets/decorative/@TZ yod@002 [786x786].png",
    "assets/decorative/@TaiyZun ~ Logo ~ 00123 ~ 786 [786x786].png",
    "assets/decorative/@TimEsuiTs [8192x8192].png",
    "assets/decorative/@eArTh ~ round [9685x9685].png",
    "assets/decorative/@tZ ~ ganesh ~ 2019 [1786x1786].png",
    "assets/decorative/Tai [4034x4733].png",
    "assets/decorative/TainfiniTy copy [8192x8192].png",
    "assets/decorative/TaiyZun @mE 2021 b [6000x6000].png",
    "assets/decorative/TaiyZun @mE 2021 g [2420x2420].png",
    "assets/decorative/TaiyZun @mE 2021 h [2420x2420].png",
    "assets/decorative/TaiyZun @mE 2021 q [1420x1420].png",
    "assets/decorative/TaiyZun @mE 2021 u [1420x1420].png",
    "assets/decorative/TaiyZun logo Sa [1080x1080].png",
    "assets/decorative/TaiyZun ~ logO ~ only ~ 2021 [900x1800].png",
    "assets/decorative/TaiyZun ~ logO ~ only ~ new ~ 2021 [600x900].png",
    "assets/decorative/TaiyZun ~ sword ~ full ~ logO ~ 2021 [2420x1452].png",
    "assets/decorative/TaiyZun ~ sword ~ logO ~ 2021 [2420x1452].png",
    "assets/decorative/TaiyZun ~ sword ~ logO ~ full ~ 2021 [2420x1613].png",
    "assets/decorative/ae0ne ~ small [3000x2250].png",
    "assets/decorative/e@rth [1786x1786].png",
    "assets/decorative/namEsis [512x512].png",
    "assets/decorative/s-T-i-n- [500x786].png",
    "assets/decorative/suiTs [2786x2786].png",
    "assets/easter-eggs/at-slogo.png",
    "assets/easter-eggs/diya.png",
    "assets/easter-eggs/earth-mandala.png",
    "assets/easter-eggs/epoch.png",
    "assets/easter-eggs/ganesh.png",
    "assets/easter-eggs/hearts-line.png",
    "assets/easter-eggs/infinite-hearts.png",
    "assets/easter-eggs/logo-white.png",
    "assets/easter-eggs/signature.png",
    "assets/easter-eggs/star-polygon.png",
    "assets/easter-eggs/stingray.png",
    "assets/easter-eggs/sword.png",
    "assets/easter-eggs/tainfinity.png"
  ];

  const optimizedDecorativeAssets = {
      "assets/decorative/8 ~ ball ~ c ~ liberTy [2000x3000].png": {
          "small": "assets/decorative/optimized/decor-01-6064707a18-384.webp",
          "large": "assets/decorative/optimized/decor-01-6064707a18.webp"
      },
      "assets/decorative/@TZ 4233 001 [786x786].png": {
          "small": "assets/decorative/optimized/decor-02-1e4b1392b1-384.webp",
          "large": "assets/decorative/optimized/decor-02-1e4b1392b1.webp"
      },
      "assets/decorative/@TZ 4233 TSb [786x786].png": {
          "small": "assets/decorative/optimized/decor-03-10841040b6-384.webp",
          "large": "assets/decorative/optimized/decor-03-10841040b6.webp"
      },
      "assets/decorative/@TZ 4233 [786x786].png": {
          "small": "assets/decorative/optimized/decor-04-abc334266c-384.webp",
          "large": "assets/decorative/optimized/decor-04-abc334266c.webp"
      },
      "assets/decorative/@TZ breaThain 0002 7o6 [928x3303].png": {
          "small": "assets/decorative/optimized/decor-05-c2da58b2fd-384.webp",
          "large": "assets/decorative/optimized/decor-05-c2da58b2fd.webp"
      },
      "assets/decorative/@TZ breaThain 0004 STing [1666x2258].png": {
          "small": "assets/decorative/optimized/decor-06-28c436cfc5-384.webp",
          "large": "assets/decorative/optimized/decor-06-28c436cfc5.webp"
      },
      "assets/decorative/@TZ breaThain 0005 layer 20 [2720x1869].png": {
          "small": "assets/decorative/optimized/decor-07-875a39f87e-384.webp",
          "large": "assets/decorative/optimized/decor-07-875a39f87e.webp"
      },
      "assets/decorative/@TZ breaThain 0007 layer 12 [3713x3838].png": {
          "small": "assets/decorative/optimized/decor-08-e38790efe1-384.webp",
          "large": "assets/decorative/optimized/decor-08-e38790efe1.webp"
      },
      "assets/decorative/@TZ breaThain 0008 layer 22 [1983x1589].png": {
          "small": "assets/decorative/optimized/decor-09-aabafc3ad6-384.webp",
          "large": "assets/decorative/optimized/decor-09-aabafc3ad6.webp"
      },
      "assets/decorative/@TZ breaThain 0009 layer 21 [3322x2728].png": {
          "small": "assets/decorative/optimized/decor-10-1af9d19f49-384.webp",
          "large": "assets/decorative/optimized/decor-10-1af9d19f49.webp"
      },
      "assets/decorative/@TZ breaThain 0011 infiniTe hEarTS [8183x1527].png": {
          "small": "assets/decorative/optimized/decor-11-003dbf7e69-384.webp",
          "large": "assets/decorative/optimized/decor-11-003dbf7e69.webp"
      },
      "assets/decorative/@TZ breaThain 0012 namESiS [1765x1515].png": {
          "small": "assets/decorative/optimized/decor-12-f1ef6d07f1-384.webp",
          "large": "assets/decorative/optimized/decor-12-f1ef6d07f1.webp"
      },
      "assets/decorative/@TZ breaThain 0013 Smile iTS mE Sword [1945x2374].png": {
          "small": "assets/decorative/optimized/decor-13-2a4b750a8f-384.webp",
          "large": "assets/decorative/optimized/decor-13-2a4b750a8f.webp"
      },
      "assets/decorative/@TZ yod@002 [786x786].png": {
          "small": "assets/decorative/optimized/decor-14-d8bf4299fe-384.webp",
          "large": "assets/decorative/optimized/decor-14-d8bf4299fe.webp"
      },
      "assets/decorative/@TaiyZun ~ Logo ~ 00123 ~ 786 [786x786].png": {
          "small": "assets/decorative/optimized/decor-15-01151cb738-384.webp",
          "large": "assets/decorative/optimized/decor-15-01151cb738.webp"
      },
      "assets/decorative/@TimEsuiTs [8192x8192].png": {
          "small": "assets/decorative/optimized/decor-16-6807d17293-384.webp",
          "large": "assets/decorative/optimized/decor-16-6807d17293.webp"
      },
      "assets/decorative/@eArTh ~ round [9685x9685].png": {
          "small": "assets/decorative/optimized/decor-17-2cd6df39a1-384.webp",
          "large": "assets/decorative/optimized/decor-17-2cd6df39a1.webp"
      },
      "assets/decorative/@tZ ~ ganesh ~ 2019 [1786x1786].png": {
          "small": "assets/decorative/optimized/decor-18-040c814e89-384.webp",
          "large": "assets/decorative/optimized/decor-18-040c814e89.webp"
      },
      "assets/decorative/Tai [4034x4733].png": {
          "small": "assets/decorative/optimized/decor-19-0c8700e627-384.webp",
          "large": "assets/decorative/optimized/decor-19-0c8700e627.webp"
      },
      "assets/decorative/TainfiniTy copy [8192x8192].png": {
          "small": "assets/decorative/optimized/decor-20-9f288534be-384.webp",
          "large": "assets/decorative/optimized/decor-20-9f288534be.webp"
      },
      "assets/decorative/TaiyZun @mE 2021 b [6000x6000].png": {
          "small": "assets/decorative/optimized/decor-21-ffedf25a3b-384.webp",
          "large": "assets/decorative/optimized/decor-21-ffedf25a3b.webp"
      },
      "assets/decorative/TaiyZun @mE 2021 g [2420x2420].png": {
          "small": "assets/decorative/optimized/decor-22-55bbdfde65-384.webp",
          "large": "assets/decorative/optimized/decor-22-55bbdfde65.webp"
      },
      "assets/decorative/TaiyZun @mE 2021 h [2420x2420].png": {
          "small": "assets/decorative/optimized/decor-23-80d41399a1-384.webp",
          "large": "assets/decorative/optimized/decor-23-80d41399a1.webp"
      },
      "assets/decorative/TaiyZun @mE 2021 q [1420x1420].png": {
          "small": "assets/decorative/optimized/decor-24-9b29cd9f26-384.webp",
          "large": "assets/decorative/optimized/decor-24-9b29cd9f26.webp"
      },
      "assets/decorative/TaiyZun @mE 2021 u [1420x1420].png": {
          "small": "assets/decorative/optimized/decor-25-5bc8d42695-384.webp",
          "large": "assets/decorative/optimized/decor-25-5bc8d42695.webp"
      },
      "assets/decorative/TaiyZun logo Sa [1080x1080].png": {
          "small": "assets/decorative/optimized/decor-26-8b2d2d5932-384.webp",
          "large": "assets/decorative/optimized/decor-26-8b2d2d5932.webp"
      },
      "assets/decorative/TaiyZun ~ logO ~ only ~ 2021 [900x1800].png": {
          "small": "assets/decorative/optimized/decor-27-3357d45ec6-384.webp",
          "large": "assets/decorative/optimized/decor-27-3357d45ec6.webp"
      },
      "assets/decorative/TaiyZun ~ logO ~ only ~ new ~ 2021 [600x900].png": {
          "small": "assets/decorative/optimized/decor-28-684378f719-384.webp",
          "large": "assets/decorative/optimized/decor-28-684378f719.webp"
      },
      "assets/decorative/TaiyZun ~ sword ~ full ~ logO ~ 2021 [2420x1452].png": {
          "small": "assets/decorative/optimized/decor-29-a08899d7c9-384.webp",
          "large": "assets/decorative/optimized/decor-29-a08899d7c9.webp"
      },
      "assets/decorative/TaiyZun ~ sword ~ logO ~ 2021 [2420x1452].png": {
          "small": "assets/decorative/optimized/decor-30-501b7ecb96-384.webp",
          "large": "assets/decorative/optimized/decor-30-501b7ecb96.webp"
      },
      "assets/decorative/TaiyZun ~ sword ~ logO ~ full ~ 2021 [2420x1613].png": {
          "small": "assets/decorative/optimized/decor-31-c58de465b8-384.webp",
          "large": "assets/decorative/optimized/decor-31-c58de465b8.webp"
      },
      "assets/decorative/ae0ne ~ small [3000x2250].png": {
          "small": "assets/decorative/optimized/decor-32-87d403a230-384.webp",
          "large": "assets/decorative/optimized/decor-32-87d403a230.webp"
      },
      "assets/decorative/e@rth [1786x1786].png": {
          "small": "assets/decorative/optimized/decor-33-ca240ea221-384.webp",
          "large": "assets/decorative/optimized/decor-33-ca240ea221.webp"
      },
      "assets/decorative/namEsis [512x512].png": {
          "small": "assets/decorative/optimized/decor-34-6fc12fdb8c-384.webp",
          "large": "assets/decorative/optimized/decor-34-6fc12fdb8c.webp"
      },
      "assets/decorative/s-T-i-n- [500x786].png": {
          "small": "assets/decorative/optimized/decor-35-6202c3a156-384.webp",
          "large": "assets/decorative/optimized/decor-35-6202c3a156.webp"
      },
      "assets/decorative/suiTs [2786x2786].png": {
          "small": "assets/decorative/optimized/decor-36-598e9f2098-384.webp",
          "large": "assets/decorative/optimized/decor-36-598e9f2098.webp"
      },
      "assets/easter-eggs/at-slogo.png": {
          "small": "assets/decorative/optimized/decor-37-11f1e47b15-384.webp",
          "large": "assets/decorative/optimized/decor-37-11f1e47b15.webp"
      },
      "assets/easter-eggs/diya.png": {
          "small": "assets/decorative/optimized/decor-38-0700e4820b-384.webp",
          "large": "assets/decorative/optimized/decor-38-0700e4820b.webp"
      },
      "assets/easter-eggs/earth-mandala.png": {
          "small": "assets/decorative/optimized/decor-39-cc91bc241e-384.webp",
          "large": "assets/decorative/optimized/decor-39-cc91bc241e.webp"
      },
      "assets/easter-eggs/epoch.png": {
          "small": "assets/decorative/optimized/decor-40-580000a6de-384.webp",
          "large": "assets/decorative/optimized/decor-40-580000a6de.webp"
      },
      "assets/easter-eggs/ganesh.png": {
          "small": "assets/decorative/optimized/decor-41-cfc044c50c-384.webp",
          "large": "assets/decorative/optimized/decor-41-cfc044c50c.webp"
      },
      "assets/easter-eggs/hearts-line.png": {
          "small": "assets/decorative/optimized/decor-42-c3cdf9ce50-384.webp",
          "large": "assets/decorative/optimized/decor-42-c3cdf9ce50.webp"
      },
      "assets/easter-eggs/infinite-hearts.png": {
          "small": "assets/decorative/optimized/decor-43-6337a4ecb2-384.webp",
          "large": "assets/decorative/optimized/decor-43-6337a4ecb2.webp"
      },
      "assets/easter-eggs/logo-white.png": {
          "small": "assets/decorative/optimized/decor-44-80b2d62546-384.webp",
          "large": "assets/decorative/optimized/decor-44-80b2d62546.webp"
      },
      "assets/easter-eggs/signature.png": {
          "small": "assets/decorative/optimized/decor-45-dbdcffeb8e-384.webp",
          "large": "assets/decorative/optimized/decor-45-dbdcffeb8e.webp"
      },
      "assets/easter-eggs/star-polygon.png": {
          "small": "assets/decorative/optimized/decor-46-171f84453f-384.webp",
          "large": "assets/decorative/optimized/decor-46-171f84453f.webp"
      },
      "assets/easter-eggs/stingray.png": {
          "small": "assets/decorative/optimized/decor-47-45ddd777ac-384.webp",
          "large": "assets/decorative/optimized/decor-47-45ddd777ac.webp"
      },
      "assets/easter-eggs/sword.png": {
          "small": "assets/decorative/optimized/decor-48-bb8cc65c4a-384.webp",
          "large": "assets/decorative/optimized/decor-48-bb8cc65c4a.webp"
      },
      "assets/easter-eggs/tainfinity.png": {
          "small": "assets/decorative/optimized/decor-49-eabf0a16e7-384.webp",
          "large": "assets/decorative/optimized/decor-49-eabf0a16e7.webp"
      }
  };

  const pageKeys = ["home-page", "journey-page", "odyssey-page", "creations-page", "connect-page"];
  const pageKey = pageKeys.find((key) => body.classList.contains(key)) || "home-page";
  const targetSections = Array.from(
    document.querySelectorAll(
      ".hero, .page-hero, section.section-bg, .bio-section, .timeline-section, .gallery-section, .connect-section, .social-section, footer"
    )
  );

  if (!targetSections.length || !decorativeAssets.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pageLoadNonce = `${pageKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  const deckStorageKey = "taiyzunDecorativeDeckV8";
  const horizontalLanes = [
    { name: "far-left", min: 2, max: 12 },
    { name: "left", min: 13, max: 27 },
    { name: "centre-left", min: 29, max: 43 },
    { name: "centre-right", min: 57, max: 71 },
    { name: "right", min: 73, max: 87 },
    { name: "far-right", min: 88, max: 98 }
  ];
  const laneOrder = [0, 5, 2, 4, 1, 3, 5, 0, 4, 2, 3, 1];
  const motionVariants = [
    { key: "drift-nw", pattern: "drift", dirX: -1, dirY: -1, rotDir: 1 },
    { key: "drift-ne", pattern: "drift", dirX: 1, dirY: -1, rotDir: -1 },
    { key: "drift-sw", pattern: "drift", dirX: -1, dirY: 1, rotDir: -1 },
    { key: "drift-se", pattern: "drift", dirX: 1, dirY: 1, rotDir: 1 },
    { key: "orbit-cw", pattern: "orbit", dirX: 1, dirY: 1, rotDir: 1 },
    { key: "orbit-ccw", pattern: "orbit", dirX: -1, dirY: 1, rotDir: -1 },
    { key: "sway-left", pattern: "sway", dirX: -1, dirY: 1, rotDir: 1 },
    { key: "sway-right", pattern: "sway", dirX: 1, dirY: -1, rotDir: -1 },
    { key: "glide-rise", pattern: "glide", dirX: 1, dirY: -1, rotDir: 1 },
    { key: "glide-fall", pattern: "glide", dirX: -1, dirY: 1, rotDir: -1 }
  ];
  const legacyDecoratives = document.querySelectorAll(
    ".hero-decorative-png, .decor-top-left, .decor-top-right, .decor-bottom-left, .decor-center-right, .easter-egg, .parallax-el"
  );
  const items = [];
  const field = document.createElement("div");
  let currentPageAssets = [];
  let frameHandle = 0;
  let resizeHandle = 0;
  let pointerObserver = null;
  let decorativeFieldStarted = false;
  const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const pointerState = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    active: false
  };

  legacyDecoratives.forEach((node) => {
    const wrapper = node.closest("picture");
    if (wrapper) {
      wrapper.remove();
      return;
    }
    node.remove();
  });

  field.id = "siteDecorativeField";
  field.setAttribute("aria-hidden", "true");

  const skipLink = body.querySelector(".skip-link");
  body.insertBefore(field, skipLink ? skipLink.nextSibling : body.firstChild);

  function hashString(input) {
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash) || 1;
  }

  function createRng(seedValue) {
    let seed = seedValue % 2147483647;
    if (seed <= 0) {
      seed += 2147483646;
    }

    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function readDeckState() {
    try {
      const raw = window.sessionStorage.getItem(deckStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !Array.isArray(parsed.unused)) {
        return { unused: [] };
      }
      return parsed;
    } catch (error) {
      return { unused: [] };
    }
  }

  function writeDeckState(state) {
    try {
      window.sessionStorage.setItem(deckStorageKey, JSON.stringify(state));
    } catch (error) {
      // Storage can be unavailable in private contexts; decorative allocation can still continue.
    }
  }

  function shuffleRandom(list) {
    const deck = list.slice();
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    return deck;
  }

  function takeDecorativeAssets(count) {
    const state = readDeckState();
    const chosen = [];
    const chosenSet = new Set();

    while (chosen.length < count) {
      if (!state.unused.length) {
        const available = decorativeAssets.filter((path) => !chosenSet.has(path));
        const nextDeck = shuffleRandom(available.length ? available : decorativeAssets);
        if (state.lastAsset && nextDeck.length > 1 && nextDeck[0] === state.lastAsset) {
          [nextDeck[0], nextDeck[1]] = [nextDeck[1], nextDeck[0]];
        }
        state.unused = nextDeck;
      }

      const nextAsset = state.unused.shift();
      if (!nextAsset || chosenSet.has(nextAsset)) {
        continue;
      }

      chosen.push(nextAsset);
      chosenSet.add(nextAsset);
      state.lastAsset = nextAsset;
    }

    writeDeckState(state);
    return chosen;
  }

  function shuffle(list, rng) {
    const deck = list.slice();
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    return deck;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distanceBetween(left, top, right, bottom) {
    return Math.hypot(left - right, top - bottom);
  }

  function optimizedAssetSet(assetPath) {
    return optimizedDecorativeAssets[assetPath] || null;
  }

  function optimizedAssetPath(assetPath) {
    const optimized = optimizedAssetSet(assetPath);
    return optimized ? optimized.large : assetPath;
  }

  function parseAspectRatio(assetPath) {
    const match = assetPath.match(/\[(\d+)x(\d+)\]/);
    if (!match) {
      return 1;
    }
    return Number(match[1]) / Number(match[2]);
  }

  function viewportTier() {
    if (window.innerWidth >= 1280) {
      return "desktop";
    }
    if (window.innerWidth >= 768) {
      return "tablet";
    }
    return "mobile";
  }

  function countForSection(section) {
    const tier = viewportTier();
    const isHero = section.matches(".hero, .page-hero");
    const isGallery = section.matches(".gallery-section, .timeline-section");
    const isCompact = section.matches(".bio-section, .connect-section, .social-section");
    const isFooter = section.matches("footer");

    if (isHero) {
      return tier === "desktop" ? 5 : tier === "tablet" ? 4 : 1;
    }

    if (isGallery) {
      return tier === "desktop" ? 4 : tier === "tablet" ? 3 : 2;
    }

    if (isCompact) {
      return tier === "desktop" ? 3 : tier === "tablet" ? 2 : 1;
    }

    if (isFooter) {
      return 1;
    }

    return 1;
  }

  function priorityForSection(section) {
    if (section.matches(".hero, .page-hero")) {
      return 5;
    }
    if (section.matches(".gallery-section, .timeline-section")) {
      return 4;
    }
    if (section.matches(".connect-section, .social-section, .bio-section")) {
      return 3;
    }
    if (section.matches("footer")) {
      return 1;
    }
    return 2;
  }

  function maxItemsForViewport() {
    const pageMultiplier = Math.max(1, Math.ceil(Math.max(document.body.scrollHeight, window.innerHeight) / Math.max(window.innerHeight, 1)));

    if (window.innerWidth >= 1280) {
      return Math.min(decorativeAssets.length, pageKey === "home-page" ? 24 : 22 + pageMultiplier * 2);
    }
    if (window.innerWidth >= 768) {
      return Math.min(18, 10 + pageMultiplier * 2);
    }
    return Math.min(9, 5 + pageMultiplier);
  }

  function familyForAsset(assetPath) {
    const name = assetPath.toLowerCase();
    if (name.includes("sword") || name.includes("logo")) return "mark";
    if (name.includes("earth") || name.includes("ganesh") || name.includes("diya") || name.includes("mandala")) return "spirit";
    if (name.includes("heart") || name.includes("infinity") || name.includes("suits")) return "symbol";
    if (name.includes("breathe") || name.includes("sting") || name.includes("ray")) return "organic";
    if (name.includes("@tz") || name.includes("taiyzun")) return "identity";
    return "ornament";
  }

  function sizeForAsset(assetPath, rng, isHero) {
    const ratio = parseAspectRatio(assetPath);
    let min = isHero ? 132 : 92;
    let max = isHero ? 238 : 176;

    if (ratio > 2.35) {
      min += 40;
      max += 70;
    } else if (ratio > 1.35) {
      min += 12;
      max += 24;
    } else if (ratio < 0.62) {
      min -= 8;
      max -= 16;
    }

    if (window.innerWidth < 768) {
      min *= 0.7;
      max *= 0.72;
    } else if (window.innerWidth < 1100) {
      min *= 0.84;
      max *= 0.86;
    }

    return Math.round(min + rng() * (max - min));
  }

  function motionMetrics(pattern, isHero, rng) {
    const heroBoost = isHero ? 1.18 : 1;
    const baseAmpX = (16 + rng() * 28) * heroBoost;
    const baseAmpY = (14 + rng() * 26) * heroBoost;
    const baseSpeed = 0.38 + rng() * 0.72;
    const introDelay = (isHero ? 0.34 : 0.18) + rng() * 0.9;
    const introRamp = 0.55 + rng() * 0.55;
    const rotAmp = 0.45 + rng() * 1.25;

    switch (pattern) {
      case "orbit":
        return {
          ampX: baseAmpX * 0.92,
          ampY: baseAmpY * 0.96,
          speed: baseSpeed * 0.92,
          introDelay,
          introRamp,
          rotAmp: rotAmp * 0.95
        };
      case "sway":
        return {
          ampX: baseAmpX * 1.08,
          ampY: baseAmpY * 0.55,
          speed: baseSpeed * 1.02,
          introDelay,
          introRamp,
          rotAmp: rotAmp * 0.72
        };
      case "glide":
        return {
          ampX: baseAmpX * 0.82,
          ampY: baseAmpY * 1.12,
          speed: baseSpeed * 0.84,
          introDelay,
          introRamp,
          rotAmp: rotAmp * 0.64
        };
      default:
        return {
          ampX: baseAmpX,
          ampY: baseAmpY,
          speed: baseSpeed,
          introDelay,
          introRamp,
          rotAmp
        };
    }
  }

  function pickMotionVariant(baseX, baseY, width, priorPlacements, rng) {
    const ordered = shuffle(motionVariants, rng);
    return (
      ordered.find((variant) =>
        priorPlacements.every((entry) => {
          const threshold = Math.max(250, (width + entry.width) * 0.68);
          const close = distanceBetween(baseX, baseY, entry.baseX, entry.baseY) < threshold;
          return !close || entry.motionKey !== variant.key;
        })
      ) || ordered[0]
    );
  }

  function buildSectionSlots() {
    const maxItems = maxItemsForViewport();
    const pageHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);
    const headerSafe = Math.min(pageHeight * 0.06, window.innerHeight * 0.18);
    const bottomSafe = Math.min(180, window.innerHeight * 0.12);
    const usableTop = Math.max(84, headerSafe);
    const usableHeight = Math.max(window.innerHeight * 0.9, pageHeight - usableTop - bottomSafe);
    const bandCount = Math.max(6, Math.min(maxItems, Math.ceil(pageHeight / Math.max(360, window.innerHeight * 0.42))));
    const slots = [];

    for (let index = 0; index < maxItems; index += 1) {
      const band = index % bandCount;
      const round = Math.floor(index / bandCount);
      const bandTop = usableTop + (usableHeight / bandCount) * band;
      const bandBottom = usableTop + (usableHeight / bandCount) * (band + 1);
      const lane = horizontalLanes[laneOrder[(index + round * 3) % laneOrder.length]];
      const verticalBias = round % 2 === 0 ? 0.32 : 0.68;
      slots.push({
        section: targetSections[Math.min(targetSections.length - 1, index % targetSections.length)] || body,
        sectionIndex: index % Math.max(targetSections.length, 1),
        slot: index,
        lane,
        bandTop,
        bandBottom,
        verticalBias
      });
    }

    return slots;
  }

  function createPlacement(slotInfo, assetPath, assetIndex, priorPlacements) {
    const { section, sectionIndex, slot, lane, bandTop, bandBottom, verticalBias } = slotInfo;
    const seed = hashString(`${pageLoadNonce}:${sectionIndex}:${slot}:${assetPath}`);
    const rng = createRng(seed);
    const isHero = section.matches && section.matches(".hero, .page-hero");
    const width = sizeForAsset(assetPath, rng, isHero);
    const laneInfo = lane || horizontalLanes[slot % horizontalLanes.length];
    let leftPercent = laneInfo.min + rng() * (laneInfo.max - laneInfo.min);
    let topPercent = verticalBias + (rng() - 0.5) * 0.42;
    const bandStart = Number.isFinite(bandTop) ? bandTop : window.scrollY;
    const bandEnd = Number.isFinite(bandBottom) ? bandBottom : bandStart + window.innerHeight;
    const bandHeight = Math.max(220, bandEnd - bandStart);
    let baseX = clamp((window.innerWidth - width) * (leftPercent / 100), -width * 0.18, window.innerWidth - width * 0.82);
    let baseY = bandStart + bandHeight * clamp(topPercent, 0.16, 0.84) - width * 0.35;

    for (let attempt = 0; attempt < 18; attempt += 1) {
      const tooClose = priorPlacements.some((entry) => {
        const thresholdX = Math.max(170, (width + entry.width) * 0.72);
        const thresholdY = Math.max(220, (width + entry.width) * 0.82);
        const sameFamily = entry.family === familyForAsset(assetPath);
        return Math.abs(baseX - entry.baseX) < thresholdX && Math.abs(baseY - entry.baseY) < thresholdY * (sameFamily ? 1.45 : 1);
      });

      if (!tooClose) break;

      const alternateLane = horizontalLanes[(slot + attempt * 2 + 1) % horizontalLanes.length];
      leftPercent = alternateLane.min + rng() * (alternateLane.max - alternateLane.min);
      topPercent = ((attempt % 5) + 0.5) / 5 + (rng() - 0.5) * 0.16;
      baseX = clamp((window.innerWidth - width) * (leftPercent / 100), -width * 0.18, window.innerWidth - width * 0.82);
      baseY = bandStart + bandHeight * clamp(topPercent, 0.12, 0.88) - width * 0.35;
    }
    const motionVariant = pickMotionVariant(baseX, baseY, width, priorPlacements, rng);
    const metrics = motionMetrics(motionVariant.pattern, isHero, rng);
    const scrollXFactor = (0.035 + rng() * 0.095) * motionVariant.dirX;
    const scrollYFactor = (0.115 + rng() * 0.22) * motionVariant.dirY;
    const scrollSpeedFactor = (0.028 + rng() * 0.055) * (rng() > 0.5 ? 1 : -1);
    const driftAmpX = prefersReducedMotion.matches ? 0 : metrics.ampX;
    const driftAmpY = prefersReducedMotion.matches ? 0 : metrics.ampY;
    const driftSpeed = metrics.speed;
    const driftPhase = rng() * Math.PI * 2;
    const introDelay = prefersReducedMotion.matches ? 0 : metrics.introDelay;
    const introRamp = prefersReducedMotion.matches ? 0 : metrics.introRamp;
    const rotationDrift = prefersReducedMotion.matches ? 0 : metrics.rotAmp * motionVariant.rotDir;
    const rotationScroll = prefersReducedMotion.matches ? 0 : (0.004 + rng() * 0.01) * motionVariant.rotDir;
    const pointerDepth = (isHero ? 14 + rng() * 18 : 8 + rng() * 16) * motionVariant.dirX;
    const pointerLift = (isHero ? 10 + rng() * 16 : 7 + rng() * 13) * motionVariant.dirY;
    const pointerRotate = (0.45 + rng() * 1.25) * motionVariant.rotDir;
    const opacity = isHero ? 0.14 + rng() * 0.06 : 0.09 + rng() * 0.05;
    const image = document.createElement("img");

    image.className = `site-decorative-png${isHero ? " is-hero-decor" : ""}`;
    const optimizedAsset = optimizedAssetSet(assetPath);
    image.src = optimizedAssetPath(assetPath);
    if (optimizedAsset) {
      image.srcset = `${optimizedAsset.small} 384w, ${optimizedAsset.large} 640w`;
      image.sizes = `${width}px`;
    }
    image.dataset.originalSrc = assetPath;
    image.onerror = () => image.remove();
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.fetchPriority = "low";
    image.setAttribute("aria-hidden", "true");
    image.style.setProperty("--decor-width", `${width}px`);
    image.style.setProperty("--decor-opacity", opacity.toFixed(3));
    image.dataset.baseX = baseX.toFixed(2);
    image.dataset.baseY = baseY.toFixed(2);
    image.dataset.scrollXFactor = scrollXFactor.toFixed(5);
    image.dataset.scrollYFactor = scrollYFactor.toFixed(5);
    image.dataset.scrollSpeedFactor = scrollSpeedFactor.toFixed(5);
    image.dataset.driftAmpX = driftAmpX.toFixed(3);
    image.dataset.driftAmpY = driftAmpY.toFixed(3);
    image.dataset.driftSpeed = driftSpeed.toFixed(5);
    image.dataset.driftPhase = driftPhase.toFixed(5);
    image.dataset.baseRotation = "0";
    image.dataset.rotationDrift = rotationDrift.toFixed(5);
    image.dataset.rotationScroll = rotationScroll.toFixed(5);
    image.dataset.pointerDepth = pointerDepth.toFixed(5);
    image.dataset.pointerLift = pointerLift.toFixed(5);
    image.dataset.pointerRotate = pointerRotate.toFixed(5);
    image.dataset.motionPattern = motionVariant.pattern;
    image.dataset.motionKey = motionVariant.key;
    image.dataset.motionDelay = introDelay.toFixed(5);
    image.dataset.motionRamp = introRamp.toFixed(5);

    return image;
  }

  function ensurePageAssets(count) {
    if (currentPageAssets.length < count) {
      currentPageAssets = currentPageAssets.concat(takeDecorativeAssets(count - currentPageAssets.length));
    }

    return currentPageAssets.slice(0, count);
  }

  function render(force = false) {
    const scrollY = window.scrollY;
    const lastScrollY = Number(field.dataset.lastScrollY || scrollY);
    const instantVelocity = clamp(scrollY - lastScrollY, -90, 90);
    const storedVelocity = Number(field.dataset.scrollVelocity || 0);
    field.dataset.scrollVelocity = (storedVelocity * 0.78 + instantVelocity * 0.22).toFixed(4);
    field.dataset.lastScrollY = String(scrollY);
    const time = performance.now() * 0.001;
    const pointerEnabled = !prefersReducedMotion.matches && supportsFinePointer.matches;

    if (pointerEnabled) {
      const easing = pointerState.active ? 0.1 : 0.055;
      pointerState.x += (pointerState.targetX - pointerState.x) * easing;
      pointerState.y += (pointerState.targetY - pointerState.y) * easing;
    } else {
      pointerState.x = 0;
      pointerState.y = 0;
    }

    items.forEach((image) => {
      const baseX = Number(image.dataset.baseX || 0);
      const baseY = Number(image.dataset.baseY || 0);
      const scrollXFactor = Number(image.dataset.scrollXFactor || 0);
      const scrollYFactor = Number(image.dataset.scrollYFactor || 0);
      const scrollSpeedFactor = Number(image.dataset.scrollSpeedFactor || 0);
      const driftAmpX = Number(image.dataset.driftAmpX || 0);
      const driftAmpY = Number(image.dataset.driftAmpY || 0);
      const driftSpeed = Number(image.dataset.driftSpeed || 0);
      const driftPhase = Number(image.dataset.driftPhase || 0);
      const motionPattern = image.dataset.motionPattern || "drift";
      const motionDelay = Number(image.dataset.motionDelay || 0);
      const motionRamp = Number(image.dataset.motionRamp || 0.6);
      const baseRotation = Number(image.dataset.baseRotation || 0);
      const rotationDrift = Number(image.dataset.rotationDrift || 0);
      const rotationScroll = Number(image.dataset.rotationScroll || 0);
      const pointerDepth = Number(image.dataset.pointerDepth || 0);
      const pointerLift = Number(image.dataset.pointerLift || 0);
      const pointerRotate = Number(image.dataset.pointerRotate || 0);
      const liveTime = Math.max(0, time - motionDelay);
      const ramp = prefersReducedMotion.matches ? 0 : clamp(liveTime / Math.max(motionRamp, 0.001), 0, 1);
      let driftX = 0;
      let driftY = 0;
      let rotationWave = 0;

      if (!prefersReducedMotion.matches && liveTime > 0) {
        const motionTime = liveTime * driftSpeed;

        switch (motionPattern) {
          case "orbit":
            driftX = Math.cos(motionTime * 1.04 + driftPhase) * driftAmpX;
            driftY = Math.sin(motionTime * 1.04 + driftPhase) * driftAmpY;
            rotationWave = Math.sin(motionTime * 0.62 + driftPhase) * rotationDrift;
            break;
          case "sway":
            driftX = Math.sin(motionTime * 1.16 + driftPhase) * driftAmpX;
            driftY = Math.sin(motionTime * 0.58 + driftPhase) * driftAmpY;
            rotationWave = Math.sin(motionTime * 0.8 + driftPhase) * rotationDrift;
            break;
          case "glide":
            driftX =
              Math.sin(motionTime * 0.74 + driftPhase) * driftAmpX +
              Math.cos(motionTime * 0.34 + driftPhase) * driftAmpX * 0.26;
            driftY = Math.cos(motionTime * 0.86 + driftPhase) * driftAmpY;
            rotationWave = Math.sin(motionTime * 0.52 + driftPhase) * rotationDrift;
            break;
          default:
            driftX = Math.sin(motionTime + driftPhase) * driftAmpX;
            driftY = Math.cos(motionTime * 0.92 + driftPhase) * driftAmpY;
            rotationWave = Math.sin(motionTime * 0.65 + driftPhase) * rotationDrift;
            break;
        }
      }

      driftX *= ramp;
      driftY *= ramp;
      const shiftX = prefersReducedMotion.matches ? 0 : scrollY * scrollXFactor * ramp;
      const scrollVelocity = Number(field.dataset.scrollVelocity || 0);
      const shiftY = prefersReducedMotion.matches ? 0 : (scrollY * scrollYFactor + scrollVelocity * scrollSpeedFactor) * ramp;
      const pointerX = pointerEnabled ? pointerState.x * pointerDepth * ramp : 0;
      const pointerY = pointerEnabled ? pointerState.y * pointerLift * ramp : 0;
      const pointerTurn = pointerEnabled ? pointerState.x * pointerRotate * ramp : 0;
      const pointerScale = pointerEnabled ? 1 + Math.min(0.025, Math.hypot(pointerState.x, pointerState.y) * 0.012 * ramp) : 1;
      const rotation = prefersReducedMotion.matches
        ? baseRotation
        : baseRotation + scrollY * rotationScroll * ramp + rotationWave * ramp + pointerTurn;

      if (force) {
        image.style.opacity = image.style.getPropertyValue("--decor-opacity");
      }

      image.style.transform = `translate3d(${baseX + shiftX + driftX + pointerX}px, ${baseY + shiftY + driftY + pointerY}px, 0) rotate(${rotation}deg) scale(${pointerScale})`;
    });
  }

  function layout() {
    const slots = buildSectionSlots();
    const assetDeck = ensurePageAssets(slots.length);
    const placementRecords = [];

    field.innerHTML = "";
    items.length = 0;
    field.dataset.lastScrollY = String(window.scrollY);
    field.dataset.scrollVelocity = "0";
    field.style.height = `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`;

    slots.forEach((slotInfo, index) => {
      const image = createPlacement(slotInfo, assetDeck[index], index, placementRecords);
      placementRecords.push({
        baseX: Number(image.dataset.baseX || 0),
        baseY: Number(image.dataset.baseY || 0),
        width: Number((image.style.getPropertyValue("--decor-width") || "0").replace("px", "")) || 0,
        motionKey: image.dataset.motionKey || "",
        family: familyForAsset(image.dataset.originalSrc || "")
      });
      items.push(image);
      field.appendChild(image);
    });

    render(true);
  }

  function loop() {
    render();
    frameHandle = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (prefersReducedMotion.matches || frameHandle || document.hidden) {
      return;
    }
    frameHandle = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (!frameHandle) {
      return;
    }
    window.cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }

  function scheduleRender() {
    if (prefersReducedMotion.matches) {
      render(true);
      return;
    }
    if (!frameHandle) {
      startLoop();
    }
  }

  function scheduleLayout() {
    window.clearTimeout(resizeHandle);
    resizeHandle = window.setTimeout(() => {
      layout();
      startLoop();
    }, 140);
  }

  function updatePointer(event) {
    if (prefersReducedMotion.matches || !supportsFinePointer.matches) {
      return;
    }

    pointerState.targetX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
    pointerState.targetY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
    pointerState.active = true;
    scheduleRender();
  }

  function softenPointer() {
    pointerState.targetX = 0;
    pointerState.targetY = 0;
    pointerState.active = false;
    scheduleRender();
  }

  function initPointerReactiveSurfaces() {
    if (prefersReducedMotion.matches || !supportsFinePointer.matches) {
      return;
    }

    const selectors = [
      ".art-item",
      ".gallery-item",
      ".highlight-card",
      ".value-item",
      ".timeline-category",
      ".info-card",
      ".social-card",
      ".gallery-label",
      ".connect-label",
      ".contact-form",
      ".cat-tab",
      ".submit-btn",
      ".social-link"
    ].join(",");

    document.querySelectorAll(selectors).forEach((node, index) => {
      if (node.dataset.pointerReactiveReady === "true") {
        return;
      }

      node.dataset.pointerReactiveReady = "true";
      node.classList.add("pointer-reactive");
      node.style.setProperty("--reactive-delay", `${(index % 7) * 24}ms`);

      node.addEventListener("pointermove", (event) => {
        const rect = node.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
        const y = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
        const tiltX = (0.5 - y) * 7;
        const tiltY = (x - 0.5) * 8;

        node.classList.add("is-pointer-active");
        node.style.setProperty("--pointer-x", `${(x * 100).toFixed(2)}%`);
        node.style.setProperty("--pointer-y", `${(y * 100).toFixed(2)}%`);
        node.style.setProperty("--tilt-x", `${tiltX.toFixed(3)}deg`);
        node.style.setProperty("--tilt-y", `${tiltY.toFixed(3)}deg`);
      }, { passive: true });

      node.addEventListener("pointerleave", () => {
        node.classList.remove("is-pointer-active");
        node.style.setProperty("--tilt-x", "0deg");
        node.style.setProperty("--tilt-y", "0deg");
      });
    });

    if (!pointerObserver) {
      pointerObserver = new MutationObserver((records) => {
        if (records.some((record) => record.addedNodes.length > 0)) {
          window.requestAnimationFrame(initPointerReactiveSurfaces);
        }
      });
      pointerObserver.observe(body, { childList: true, subtree: true });
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
      return;
    }
    render(true);
    startLoop();
  });

  if (typeof prefersReducedMotion.addEventListener === "function") {
    prefersReducedMotion.addEventListener("change", () => {
      layout();
      initPointerReactiveSurfaces();
      if (prefersReducedMotion.matches) {
        stopLoop();
        render(true);
      } else {
        startLoop();
      }
    });
  }

  window.addEventListener("scroll", scheduleRender, { passive: true });
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", softenPointer);
  window.addEventListener("blur", softenPointer);
  window.addEventListener("resize", scheduleLayout);
  function startDecorativeField() {
    if (decorativeFieldStarted || document.body?.dataset.taiyzun3dReady === "true") {
      return;
    }

    decorativeFieldStarted = true;
    layout();
    initPointerReactiveSurfaces();
    startLoop();
    window.setTimeout(layout, 900);
    window.setTimeout(initPointerReactiveSurfaces, 1000);
  }

  function scheduleDecorativeField() {
    const startAfterSettle = () => {
      window.setTimeout(startDecorativeField, 6500);
    };

    if (document.readyState === "complete") {
      startAfterSettle();
      return;
    }

    window.addEventListener("load", startAfterSettle, { once: true });
  }

  scheduleDecorativeField();
})();
