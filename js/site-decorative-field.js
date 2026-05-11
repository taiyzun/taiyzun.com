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
    "assets/decorative/S u i T SunSeT [1786x1786].png",
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
    "assets/decorative/TaiyZun ~ sword ~ only ~ logO ~ 2021 [1613x2420].png",
    "assets/decorative/ae0ne ~ small [3000x2250].png",
    "assets/decorative/diya [324x358].png",
    "assets/decorative/e@rth [1786x1786].png",
    "assets/decorative/ganesh@ [1100x1100].png",
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
  const deckStorageKey = "taiyzunDecorativeDeckV6";
  const anchorPresets = [
    { x: [2, 10], y: [4, 16] },
    { x: [86, 96], y: [4, 16] },
    { x: [4, 12], y: [24, 38] },
    { x: [88, 96], y: [24, 38] },
    { x: [7, 16], y: [44, 58] },
    { x: [84, 94], y: [44, 58] },
    { x: [2, 12], y: [66, 82] },
    { x: [86, 96], y: [66, 82] },
    { x: [16, 28], y: [8, 22] },
    { x: [72, 84], y: [8, 22] },
    { x: [16, 30], y: [58, 76] },
    { x: [70, 84], y: [58, 76] },
    { x: [32, 42], y: [10, 22] },
    { x: [58, 68], y: [10, 22] },
    { x: [30, 42], y: [64, 82] },
    { x: [58, 70], y: [64, 82] }
  ];
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
      return tier === "desktop" ? 5 : tier === "tablet" ? 4 : 3;
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
    if (window.innerWidth >= 1280) {
      if (pageKey === "home-page") {
        return 11;
      }
      if (pageKey === "connect-page") {
        return 12;
      }
      return 10;
    }
    if (window.innerWidth >= 768) {
      return 8;
    }
    return 6;
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
    const sections = targetSections
      .map((section, sectionIndex) => ({
        section,
        sectionIndex,
        count: countForSection(section),
        priority: priorityForSection(section)
      }))
      .sort((left, right) => right.priority - left.priority || left.sectionIndex - right.sectionIndex);

    const maxRounds = Math.max(...sections.map((entry) => entry.count));
    const slots = [];
    const maxItems = maxItemsForViewport();

    for (let round = 0; round < maxRounds; round += 1) {
      for (const entry of sections) {
        if (slots.length >= maxItems) {
          return slots;
        }
        if (round < entry.count) {
          slots.push({ section: entry.section, sectionIndex: entry.sectionIndex, slot: round });
        }
      }
    }

    return slots;
  }

  function createPlacement(slotInfo, assetPath, assetIndex, priorPlacements) {
    const { section, sectionIndex, slot } = slotInfo;
    const seed = hashString(`${pageLoadNonce}:${sectionIndex}:${slot}:${assetPath}`);
    const rng = createRng(seed);
    const isHero = section.matches(".hero, .page-hero");
    const sectionRect = section.getBoundingClientRect();
    const documentTop = window.scrollY + sectionRect.top;
    const sectionHeight = Math.max(section.offsetHeight, isHero ? 420 : 320);
    const width = sizeForAsset(assetPath, rng, isHero);
    const sectionAnchors = shuffle(anchorPresets, createRng(hashString(`${pageLoadNonce}:anchor:${sectionIndex}`)));
    const preset = sectionAnchors[(slot + assetIndex) % sectionAnchors.length];
    const leftPercent = preset.x[0] + rng() * (preset.x[1] - preset.x[0]);
    const topPercent = preset.y[0] + rng() * (preset.y[1] - preset.y[0]);
    const baseX = clamp((window.innerWidth - width) * (leftPercent / 100), -width * 0.24, window.innerWidth - width * 0.58);
    const baseY = documentTop + sectionHeight * (topPercent / 100) - width * 0.15;
    const motionVariant = pickMotionVariant(baseX, baseY, width, priorPlacements, rng);
    const metrics = motionMetrics(motionVariant.pattern, isHero, rng);
    const scrollXFactor = (0.045 + rng() * 0.08) * motionVariant.dirX;
    const scrollYFactor = (0.08 + rng() * 0.14) * motionVariant.dirY;
    const driftAmpX = prefersReducedMotion.matches ? 0 : metrics.ampX;
    const driftAmpY = prefersReducedMotion.matches ? 0 : metrics.ampY;
    const driftSpeed = metrics.speed;
    const driftPhase = rng() * Math.PI * 2;
    const introDelay = prefersReducedMotion.matches ? 0 : metrics.introDelay;
    const introRamp = prefersReducedMotion.matches ? 0 : metrics.introRamp;
    const rotationDrift = prefersReducedMotion.matches ? 0 : metrics.rotAmp * motionVariant.rotDir;
    const rotationScroll = prefersReducedMotion.matches ? 0 : (0.004 + rng() * 0.01) * motionVariant.rotDir;
    const opacity = isHero ? 0.14 + rng() * 0.06 : 0.09 + rng() * 0.05;
    const image = document.createElement("img");

    image.className = `site-decorative-png${isHero ? " is-hero-decor" : ""}`;
    image.src = assetPath;
    image.alt = "";
    image.decoding = "async";
    image.loading = isHero ? "eager" : "lazy";
    image.setAttribute("aria-hidden", "true");
    image.style.setProperty("--decor-width", `${width}px`);
    image.style.setProperty("--decor-opacity", opacity.toFixed(3));
    image.dataset.baseX = baseX.toFixed(2);
    image.dataset.baseY = baseY.toFixed(2);
    image.dataset.scrollXFactor = scrollXFactor.toFixed(5);
    image.dataset.scrollYFactor = scrollYFactor.toFixed(5);
    image.dataset.driftAmpX = driftAmpX.toFixed(3);
    image.dataset.driftAmpY = driftAmpY.toFixed(3);
    image.dataset.driftSpeed = driftSpeed.toFixed(5);
    image.dataset.driftPhase = driftPhase.toFixed(5);
    image.dataset.baseRotation = "0";
    image.dataset.rotationDrift = rotationDrift.toFixed(5);
    image.dataset.rotationScroll = rotationScroll.toFixed(5);
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
    const time = performance.now() * 0.001;

    items.forEach((image) => {
      const baseX = Number(image.dataset.baseX || 0);
      const baseY = Number(image.dataset.baseY || 0);
      const scrollXFactor = Number(image.dataset.scrollXFactor || 0);
      const scrollYFactor = Number(image.dataset.scrollYFactor || 0);
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
      const shiftY = prefersReducedMotion.matches ? 0 : scrollY * scrollYFactor * ramp;
      const rotation = prefersReducedMotion.matches ? baseRotation : baseRotation + scrollY * rotationScroll * ramp + rotationWave * ramp;

      if (force) {
        image.style.opacity = image.style.getPropertyValue("--decor-opacity");
      }

      image.style.transform = `translate3d(${baseX + shiftX + driftX}px, ${baseY + shiftY + driftY}px, 0) rotate(${rotation}deg)`;
    });
  }

  function layout() {
    const slots = buildSectionSlots();
    const assetDeck = ensurePageAssets(slots.length);
    const placementRecords = [];

    field.innerHTML = "";
    items.length = 0;
    field.style.height = `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`;

    slots.forEach((slotInfo, index) => {
      const image = createPlacement(slotInfo, assetDeck[index], index, placementRecords);
      placementRecords.push({
        baseX: Number(image.dataset.baseX || 0),
        baseY: Number(image.dataset.baseY || 0),
        width: Number((image.style.getPropertyValue("--decor-width") || "0").replace("px", "")) || 0,
        motionKey: image.dataset.motionKey || ""
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
      if (prefersReducedMotion.matches) {
        stopLoop();
        render(true);
      } else {
        startLoop();
      }
    });
  }

  window.addEventListener("scroll", scheduleRender, { passive: true });
  window.addEventListener("resize", scheduleLayout);
  window.addEventListener("load", () => {
    layout();
    startLoop();
    window.setTimeout(layout, 900);
  }, { once: true });

  layout();
  startLoop();
})();
