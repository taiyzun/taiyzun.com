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
    "assets/decorative/suiTs [2786x2786].png"
  ];

  const pageKeys = ["home-page", "journey-page", "odyssey-page", "creations-page", "connect-page"];
  const pageKey = pageKeys.find((key) => body.classList.contains(key)) || "home-page";
  const targetSections = Array.from(
    document.querySelectorAll(
      ".hero, .page-hero, section.section-bg, .bio-section, .timeline-section, .gallery-section, .connect-section, .social-section, footer"
    )
  );

  if (!targetSections.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anchorPresets = [
    { x: [3, 13], y: [7, 21] },
    { x: [84, 94], y: [9, 24] },
    { x: [1, 9], y: [36, 55] },
    { x: [90, 97], y: [37, 58] },
    { x: [5, 16], y: [70, 86] },
    { x: [82, 93], y: [71, 87] },
    { x: [18, 28], y: [18, 34] },
    { x: [72, 82], y: [20, 36] },
    { x: [20, 32], y: [62, 78] },
    { x: [68, 82], y: [64, 82] }
  ];
  const items = [];
  const field = document.createElement("div");
  let frameHandle = 0;
  let resizeHandle = 0;

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

  function parseAspectRatio(path) {
    const match = path.match(/\[(\d+)x(\d+)\]/);
    if (!match) {
      return 1;
    }

    return Number(match[1]) / Number(match[2]);
  }

  function sizeForAsset(path, rng, isHero) {
    const ratio = parseAspectRatio(path);
    let min = isHero ? 140 : 112;
    let max = isHero ? 265 : 205;

    if (ratio > 2) {
      min += 45;
      max += 75;
    } else if (ratio < 0.62) {
      min -= 10;
      max -= 25;
    }

    if (window.innerWidth < 768) {
      min *= 0.72;
      max *= 0.72;
    } else if (window.innerWidth < 1100) {
      min *= 0.86;
      max *= 0.86;
    }

    return Math.round(min + rng() * (max - min));
  }

  function countForSection(section) {
    const isHero = section.matches(".hero, .page-hero");
    const isFooter = section.matches("footer");
    const isCompact = section.matches(".bio-section, .social-section");
    const baseCount = isHero ? 4 : isFooter || isCompact ? 3 : 4;
    const mobilePenalty = window.innerWidth < 768 ? 1 : 0;
    return Math.max(1, baseCount - mobilePenalty);
  }

  function createPlacement(section, sectionIndex, slot, path, deckIndex) {
    const sectionSeed = hashString(`${pageKey}:${sectionIndex}:${slot}:${path}`);
    const rng = createRng(sectionSeed);
    const isHero = section.matches(".hero, .page-hero");
    const sectionRect = section.getBoundingClientRect();
    const documentTop = window.scrollY + sectionRect.top;
    const width = sizeForAsset(path, rng, isHero);
    const preset = anchorPresets[(deckIndex + sectionIndex + slot) % anchorPresets.length];
    const sectionHeight = Math.max(section.offsetHeight, 320);
    const leftPercent = preset.x[0] + rng() * (preset.x[1] - preset.x[0]);
    const topPercent = preset.y[0] + rng() * (preset.y[1] - preset.y[0]);
    const baseX = (window.innerWidth - width) * (leftPercent / 100);
    const baseY = documentTop + sectionHeight * (topPercent / 100);
    const speedY = (rng() > 0.5 ? 1 : -1) * (0.06 + rng() * 0.18);
    const speedX = (rng() - 0.5) * 0.11;
    const baseRotation = -12 + rng() * 24;
    const rotationSpeed = (rng() - 0.5) * 0.02;
    const opacity = isHero ? 0.13 + rng() * 0.06 : 0.1 + rng() * 0.06;
    const image = document.createElement("img");

    image.className = "site-decorative-png";
    image.src = path;
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.setAttribute("aria-hidden", "true");
    image.style.setProperty("--decor-width", `${width}px`);
    image.style.setProperty("--decor-opacity", opacity.toFixed(3));
    image.style.setProperty("--decor-float-duration", `${10 + rng() * 9}s`);
    image.style.setProperty("--decor-delay", `${-rng() * 8}s`);
    image.dataset.baseX = baseX.toFixed(2);
    image.dataset.baseY = baseY.toFixed(2);
    image.dataset.speedX = speedX.toFixed(4);
    image.dataset.speedY = speedY.toFixed(4);
    image.dataset.baseRotation = baseRotation.toFixed(3);
    image.dataset.rotationSpeed = rotationSpeed.toFixed(5);

    return image;
  }

  function render(force = false) {
    const scrollY = window.scrollY;

    items.forEach((image) => {
      const baseX = Number(image.dataset.baseX || 0);
      const baseY = Number(image.dataset.baseY || 0);
      const speedX = Number(image.dataset.speedX || 0);
      const speedY = Number(image.dataset.speedY || 0);
      const baseRotation = Number(image.dataset.baseRotation || 0);
      const rotationSpeed = Number(image.dataset.rotationSpeed || 0);
      const extraX = prefersReducedMotion ? 0 : scrollY * speedX * 24;
      const extraY = prefersReducedMotion ? 0 : scrollY * speedY;
      const extraRotation = prefersReducedMotion ? 0 : scrollY * rotationSpeed;

      if (force) {
        image.style.opacity = image.style.getPropertyValue("--decor-opacity");
      }

      image.style.transform = `translate3d(${baseX + extraX}px, ${baseY + extraY}px, 0) rotate(${baseRotation + extraRotation}deg)`;
    });
  }

  function layout() {
    const deckSeed = createRng(hashString(`${pageKey}:decorative-deck`));
    const deck = shuffle(decorativeAssets, deckSeed);
    const pageOffset = ((pageKeys.indexOf(pageKey) + 1) * 11) % deck.length;
    let deckIndex = pageOffset;

    field.innerHTML = "";
    items.length = 0;
    field.style.height = `${Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)}px`;

    targetSections.forEach((section, sectionIndex) => {
      const count = countForSection(section);

      for (let slot = 0; slot < count; slot += 1) {
        const assetPath = deck[deckIndex % deck.length];
        const image = createPlacement(section, sectionIndex, slot, assetPath, deckIndex);
        items.push(image);
        field.appendChild(image);
        deckIndex += 1;
      }
    });

    render(true);
  }

  function scheduleRender() {
    if (frameHandle) {
      return;
    }

    frameHandle = window.requestAnimationFrame(() => {
      render();
      frameHandle = 0;
    });
  }

  function scheduleLayout() {
    window.clearTimeout(resizeHandle);
    resizeHandle = window.setTimeout(layout, 120);
  }

  window.addEventListener("scroll", scheduleRender, { passive: true });
  window.addEventListener("resize", scheduleLayout);
  window.addEventListener("load", layout, { once: true });

  layout();
})();
