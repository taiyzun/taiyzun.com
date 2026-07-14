(() => {
  const MODEL_CONFIG = {
    sword: {
      modelUrl: '/3d/Taiyzun_Sword_Web.glb?v=20260714a',
      name: 'TaiyzunSword',
      cameraZ: 2.68,
      fieldOfView: 32,
      scale: 1.08,
      maxYaw: Math.PI / 18,
      maxPitch: Math.PI / 51.43,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      ambient: 0.9,
      key: 3.2,
      rim: 2.2,
      lower: 1.2,
      motion: 'pointer-and-scroll-axis-spin'
    },
    at: {
      modelUrl: '/3d/Taiyzun_At_Logo_Web.glb?v=20260714a',
      name: 'TaiyzunAtLogo',
      cameraZ: 3.15,
      fieldOfView: 34,
      scale: 0.12,
      maxYaw: Math.PI / 30,
      maxPitch: Math.PI / 45,
      offsetX: 1.05,
      offsetY: -0.65,
      offsetZ: 0,
      ambient: 0.8,
      key: 2.4,
      rim: 1.5,
      lower: 0.8,
      motion: 'clockwise-pointer-scroll-rotation'
    }
  };
  const stages = Array.from(document.querySelectorAll('[data-taiyzun-sword], [data-taiyzun-at]'));
  const CINEMA_PROFILES = {
    home: { key: 0xfff1c9, rim: 0xcce8ff, fill: 0xffd88a, exposure: 1.18, cameraTravel: 0.045, scale: 1 },
    journey: { key: 0xf7edcb, rim: 0xccefe5, fill: 0xdce8f6, exposure: 1.13, cameraTravel: 0.04, scale: 0.98 },
    odyssey: { key: 0xf4e5c0, rim: 0xdfd5ff, fill: 0xcfe7ff, exposure: 1.16, cameraTravel: 0.055, scale: 1.015 },
    creations: { key: 0xffefd6, rim: 0xccecff, fill: 0xf7dce9, exposure: 1.14, cameraTravel: 0.035, scale: 0.985 },
    connect: { key: 0xffe8d7, rim: 0xd3e8ff, fill: 0xf0dbe6, exposure: 1.12, cameraTravel: 0.03, scale: 0.97 },
    error: { key: 0xf4ecd7, rim: 0xdce6f1, fill: 0xe7d8c1, exposure: 1.08, cameraTravel: 0.02, scale: 0.94 }
  };
  const pageName = Object.keys(CINEMA_PROFILES).find((name) => document.body.classList.contains(`${name}-page`)) || 'home';
  const cinemaProfile = CINEMA_PROFILES[pageName];

  if (!stages.length) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactQuery = window.matchMedia('(max-width: 820px), (pointer: coarse)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrainedConnection = Boolean(
    connection?.saveData ||
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4)
  );
  let modulePromise;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const damp = (current, target, smoothing, delta) => {
    return current + (target - current) * (1 - Math.exp(-smoothing * delta));
  };

  function installCinematicSystem() {
    const root = document.documentElement;
    root.dataset.taiCinema = pageName;

    const field = document.createElement('div');
    field.className = 'tai-cinema-field';
    field.setAttribute('aria-hidden', 'true');
    field.innerHTML = '<span class="tai-cinema-mist tai-cinema-mist--a"></span><span class="tai-cinema-mist tai-cinema-mist--b"></span><span class="tai-cinema-stars"></span>';
    document.body.prepend(field);
    const veil = document.createElement('span');
    veil.className = 'tai-cinema-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);

    const chapters = Array.from(document.body.querySelectorAll(':scope > main, :scope > section, :scope > footer'));
    chapters.forEach((chapter) => chapter.classList.add('tai-cinema-chapter'));

    if ('IntersectionObserver' in window && !reducedMotionQuery.matches) {
      const chapterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-cinema-active', entry.isIntersecting);
          if (entry.isIntersecting && !entry.target.dataset.cinemaEntered) {
            entry.target.dataset.cinemaEntered = 'true';
            window.dispatchEvent(new CustomEvent('taiyzun:chapter-enter', { detail: { chapter: entry.target } }));
          }
        });
      }, { rootMargin: '-16% 0px -22%', threshold: 0.08 });
      chapters.forEach((chapter) => chapterObserver.observe(chapter));
    } else {
      chapters.forEach((chapter) => chapter.classList.add('is-cinema-active'));
    }

    let fieldFrame = 0;
    const updateField = (event) => {
      if (fieldFrame || reducedMotionQuery.matches) return;
      fieldFrame = window.requestAnimationFrame(() => {
        fieldFrame = 0;
        if (event?.clientX != null) {
          root.style.setProperty('--cinema-x', clamp((event.clientX / Math.max(innerWidth, 1) - 0.5) * 2, -1, 1).toFixed(3));
          root.style.setProperty('--cinema-y', clamp((event.clientY / Math.max(innerHeight, 1) - 0.5) * 2, -1, 1).toFixed(3));
        }
        root.style.setProperty('--cinema-scroll', clamp((scrollY || 0) / Math.max(document.documentElement.scrollHeight - innerHeight, 1), 0, 1).toFixed(4));
      });
    };
    window.addEventListener('pointermove', updateField, { passive: true });
    window.addEventListener('scroll', updateField, { passive: true });
    updateField();

    if (!reducedMotionQuery.matches) {
      root.classList.add('tai-cinema-entering');
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.classList.remove('tai-cinema-entering')));
    }

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotionQuery.matches) return;
      const link = event.target.closest('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin || destination.href === location.href || (destination.pathname === location.pathname && destination.search === location.search && destination.hash)) return;
      event.preventDefault();
      root.classList.add('tai-cinema-leaving');
      window.setTimeout(() => { location.href = destination.href; }, 300);
    });
  }

  installCinematicSystem();

  let signatureLogo = document.querySelector('.hero-signature-logo');
  if (!signatureLogo) {
    signatureLogo = document.createElement('picture');
    signatureLogo.className = 'hero-signature-logo';
    signatureLogo.setAttribute('aria-hidden', 'true');
    signatureLogo.innerHTML = '<img src="/assets/images/TaiyZun-Sword-logo-2026-ui-700.png" srcset="/assets/images/TaiyZun-Sword-logo-2026-ui-384.png 384w, /assets/images/TaiyZun-Sword-logo-2026-ui-700.png 700w, /assets/images/TaiyZun-Sword-logo-2026-ui-1024.png 1024w" sizes="(max-width: 520px) 139px, (max-width: 820px) 126px, 228px" alt="" width="700" height="500" loading="lazy" decoding="async" fetchpriority="low">';
    document.body.appendChild(signatureLogo);
  }
  if (signatureLogo) {
    const signatureAnchor = document.querySelector('.hero, .page-hero');
    if (!signatureAnchor || document.body.classList.contains('error-page')) {
      signatureLogo.classList.add('is-outside-hero');
    } else if ('IntersectionObserver' in window) {
      const signatureObserver = new IntersectionObserver(
        ([entry]) => signatureLogo.classList.toggle('is-outside-hero', !entry?.isIntersecting),
        { threshold: 0.08 }
      );
      signatureObserver.observe(signatureAnchor);
    } else {
      const syncSignatureVisibility = () => {
        const rect = signatureAnchor.getBoundingClientRect();
        signatureLogo.classList.toggle('is-outside-hero', rect.bottom <= 0 || rect.top >= window.innerHeight);
      };
      window.addEventListener('scroll', syncSignatureVisibility, { passive: true });
      window.addEventListener('resize', syncSignatureVisibility, { passive: true });
      syncSignatureVisibility();
    }

    let shineTimer = 0;
    let lastShine = 0;
    let lightFrame = 0;
    let lastLightTime = 0;
    let lastScrollY = window.scrollY || 0;
    let lastScrollTime = performance.now();
    const light = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      speed: 0,
      targetSpeed: 0,
      direction: 0
    };
    const dynamicLight = !reducedMotionQuery.matches && !constrainedConnection;

    signatureLogo.dataset.motion = 'shadow-only';
    signatureLogo.dataset.lightMode = dynamicLight ? 'dynamic' : 'static';

    const setLightProperties = (shadowX, shadowY, blur, platinumX, platinumY, goldAlpha, platinumAlpha) => {
      signatureLogo.style.setProperty('--signature-shadow-x', shadowX.toFixed(2));
      signatureLogo.style.setProperty('--signature-shadow-y', shadowY.toFixed(2));
      signatureLogo.style.setProperty('--signature-shadow-blur', blur.toFixed(2));
      signatureLogo.style.setProperty('--signature-platinum-x', platinumX.toFixed(2));
      signatureLogo.style.setProperty('--signature-platinum-y', platinumY.toFixed(2));
      signatureLogo.style.setProperty('--signature-gold-alpha', goldAlpha.toFixed(3));
      signatureLogo.style.setProperty('--signature-platinum-alpha', platinumAlpha.toFixed(3));
    };

    const setRestingLight = () => {
      setLightProperties(1.4, 3.2, 13.5, -0.7, 0.9, 0.19, 0.15);
      signatureLogo.classList.remove('is-light-reactive');
    };

    const animateSignatureLight = (now) => {
      lightFrame = 0;
      if (document.hidden || !dynamicLight) {
        setRestingLight();
        return;
      }

      const delta = Math.min((now - (lastLightTime || now)) / 1000, 0.05);
      lastLightTime = now;
      const compactFactor = compactQuery.matches ? 0.62 : 1;

      light.x = damp(light.x, light.targetX, 7, delta);
      light.y = damp(light.y, light.targetY, 7, delta);
      light.speed = damp(light.speed, light.targetSpeed, 8, delta);
      light.targetSpeed *= Math.exp(-6.5 * delta);

      const speed = Math.abs(light.speed);
      const shadowX = 1.4 + (light.x * 2.3 + light.direction * speed * 1.1) * compactFactor;
      const shadowY = 3.2 + (light.y * 1.45 + speed * 1.25) * compactFactor;
      const blur = 13.5 + speed * 3.2 * compactFactor;
      const platinumX = -0.7 - light.x * 0.95 * compactFactor;
      const platinumY = 0.9 - light.y * 0.55 * compactFactor;
      const goldAlpha = 0.19 + speed * 0.045 * compactFactor;
      const platinumAlpha = 0.15 + Math.abs(light.x) * 0.025 * compactFactor;
      setLightProperties(shadowX, shadowY, blur, platinumX, platinumY, goldAlpha, platinumAlpha);

      const unsettled = Math.abs(light.x - light.targetX) > 0.004
        || Math.abs(light.y - light.targetY) > 0.004
        || speed > 0.008
        || Math.abs(light.targetSpeed) > 0.008;
      if (unsettled) {
        lightFrame = window.requestAnimationFrame(animateSignatureLight);
      } else {
        signatureLogo.classList.remove('is-light-reactive');
      }
    };

    const startSignatureLight = () => {
      if (!dynamicLight || document.hidden || lightFrame) return;
      signatureLogo.classList.add('is-light-reactive');
      lastLightTime = performance.now();
      lightFrame = window.requestAnimationFrame(animateSignatureLight);
    };

    const triggerSignature = (force = false) => {
      if (reducedMotionQuery.matches) return;
      const now = performance.now();
      if (!force && now - lastShine < 4200) return;
      lastShine = now;
      signatureLogo.classList.remove('is-reactive');
      void signatureLogo.offsetWidth;
      signatureLogo.classList.add('is-reactive');
      window.clearTimeout(shineTimer);
      shineTimer = window.setTimeout(() => signatureLogo.classList.remove('is-reactive'), 1050);
    };

    window.addEventListener('pointermove', (event) => {
      if (!dynamicLight) return;
      light.targetX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
      light.targetY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
      startSignatureLight();
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      light.targetX = 0;
      light.targetY = 0;
      startSignatureLight();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!dynamicLight) return;
      const now = performance.now();
      const scrollY = window.scrollY || 0;
      const elapsed = Math.max(now - lastScrollTime, 16);
      const movement = scrollY - lastScrollY;
      light.direction = Math.sign(movement) || light.direction;
      light.targetSpeed = clamp(movement / elapsed, -1, 1);
      lastScrollY = scrollY;
      lastScrollTime = now;
      startSignatureLight();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.cancelAnimationFrame(lightFrame);
        lightFrame = 0;
        light.targetSpeed = 0;
        light.speed = 0;
        setRestingLight();
      } else {
        startSignatureLight();
      }
    });

    setRestingLight();
    window.addEventListener('taiyzun:chapter-enter', () => triggerSignature(false));
    window.setTimeout(() => triggerSignature(true), 900);
  }

  function hasWebGLSupport() {
    try {
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch (_) {
      return false;
    }
  }

  function markStatic(stage, reason) {
    stage.dataset.status = 'static';
    stage.dataset.performanceMode = reason;
  }

  function getObjectType(stage) {
    return stage.hasAttribute('data-taiyzun-at') ? 'at' : 'sword';
  }

  function getStageElements(stage) {
    return {
      canvas: stage.querySelector('[data-taiyzun-3d-canvas], [data-taiyzun-sword-canvas], [data-taiyzun-at-canvas]'),
      fallback: stage.querySelector('[data-taiyzun-3d-fallback], [data-taiyzun-sword-fallback], [data-taiyzun-at-fallback]')
    };
  }

  function enforceContainment(stage) {
    const { canvas, fallback } = getStageElements(stage);

    Object.assign(stage.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden'
    });

    if (canvas) {
      Object.assign(canvas.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%'
      });
    }

    if (fallback) {
      Object.assign(fallback.style, {
        position: 'absolute',
        maxWidth: 'min(74vw, 29rem)',
        maxHeight: '76vh',
        objectFit: 'contain'
      });
    }
  }

  function applyForgedAtPalette(THREE, mesh) {
    const geometry = mesh.geometry;
    const positions = geometry?.getAttribute('position');
    if (!positions) return;

    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const normals = geometry.getAttribute('normal');
    const width = Math.max(bounds.max.x - bounds.min.x, 0.0001);
    const height = Math.max(bounds.max.y - bounds.min.y, 0.0001);
    const depth = Math.max(bounds.max.z - bounds.min.z, 0.0001);
    const colours = new Float32Array(positions.count * 3);
    const palette = [
      new THREE.Color(0x303841),
      new THREE.Color(0xbd7435),
      new THREE.Color(0xe1b94d),
      new THREE.Color(0xd9e2e8)
    ];
    const darkSteel = new THREE.Color(0x1d2227);
    const gold = new THREE.Color(0xe0bc66);
    const silver = new THREE.Color(0xdce3e9);
    const colour = new THREE.Color();
    const smoothstep = (value) => {
      const t = clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };

    for (let index = 0; index < positions.count; index += 1) {
      const x = ((positions.getX(index) - bounds.min.x) / width) * 2 - 1;
      const y = ((positions.getY(index) - bounds.min.y) / height) * 2 - 1;
      const z = (positions.getZ(index) - bounds.min.z) / depth;
      const radius = Math.min(1, Math.hypot(x, y) / Math.SQRT2);
      const angle = Math.atan2(y, x);
      const palettePosition = ((angle + Math.PI) / (Math.PI * 2)) * palette.length;
      const from = Math.floor(palettePosition) % palette.length;
      const to = (from + 1) % palette.length;
      const blend = smoothstep(palettePosition - Math.floor(palettePosition));

      colour.copy(palette[from]).lerp(palette[to], blend);

      const frontFacing = normals ? Math.abs(normals.getZ(index)) : 1;
      const forgedEdge = clamp((1 - frontFacing) * 0.62 + (1 - z) * 0.1, 0, 0.7);
      colour.lerp(darkSteel, forgedEdge);

      if (radius < 0.36 && y > -0.34) colour.lerp(gold, 0.3);
      if (radius > 0.7 && frontFacing > 0.72) colour.lerp(silver, 0.24);

      const hammeredVariation = 0.98 + Math.sin((x * 17.3) + (y * 23.7) + (z * 11.1)) * 0.025;
      colour.multiplyScalar(hammeredVariation);
      colours[index * 3] = clamp(colour.r, 0, 1);
      colours[index * 3 + 1] = clamp(colour.g, 0, 1);
      colours[index * 3 + 2] = clamp(colour.b, 0, 1);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  }

  function applySwordBevelPalette(THREE, mesh) {
    const geometry = mesh.geometry;
    const positions = geometry?.getAttribute('position');
    if (!positions) return;

    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const width = Math.max(bounds.max.x - bounds.min.x, 0.0001);
    const height = Math.max(bounds.max.y - bounds.min.y, 0.0001);
    const colours = new Float32Array(positions.count * 3);
    const antiqueGold = new THREE.Color(0xd8aa43);
    const champagneGold = new THREE.Color(0xedcc78);
    const polishedSilver = new THREE.Color(0xbccbd7);
    const burnishedBronze = new THREE.Color(0x98602c);
    const colour = new THREE.Color();
    const smoothstep = (value) => {
      const t = clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };

    for (let index = 0; index < positions.count; index += 1) {
      const x = ((positions.getX(index) - bounds.min.x) / width) * 2 - 1;
      const y = ((positions.getY(index) - bounds.min.y) / height) * 2 - 1;
      const outerMetal = smoothstep((Math.abs(x) - 0.42) / 0.46);
      const crownMetal = smoothstep((y - 0.62) / 0.3);
      const guardMetal = Math.exp(-Math.pow((y - 0.46) / 0.2, 2));
      const centralGlow = 1 - smoothstep(Math.abs(x) / 0.34);
      const lowerForge = smoothstep((-y - 0.46) / 0.42);

      colour.copy(antiqueGold);
      colour.lerp(champagneGold, centralGlow * 0.34);
      colour.lerp(polishedSilver, clamp(outerMetal * 0.82 + crownMetal * 0.34 + guardMetal * (0.42 + outerMetal * 0.28), 0, 0.95));
      colour.lerp(burnishedBronze, lowerForge * (1 - outerMetal) * 0.18);
      colour.multiplyScalar(0.985 + Math.sin((x * 19.7) + (y * 27.1)) * 0.018);

      colours[index * 3] = clamp(colour.r, 0, 1);
      colours[index * 3 + 1] = clamp(colour.g, 0, 1);
      colours[index * 3 + 2] = clamp(colour.b, 0, 1);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  }

  function applyMetalFinish(THREE, objectType, model) {
    model.traverse((child) => {
      if (!child.isMesh) return;

      if (child.geometry && !child.geometry.getAttribute('normal')) {
        child.geometry.computeVertexNormals();
      }

      if (objectType === 'at') applyForgedAtPalette(THREE, child);
      if (objectType === 'sword' && child.name.toLowerCase().includes('bevel')) {
        applySwordBevelPalette(THREE, child);
      }

      const applyMaterial = (sourceMaterial) => {
        const material = sourceMaterial.clone();
        const materialName = (material.name || '').toLowerCase();

        if (objectType === 'at') {
          material.map = null;
          material.color.setHex(0xffffff);
          material.vertexColors = true;
          material.metalness = 0.9;
          material.roughness = 0.22;
          material.emissive?.setHex(0x171a1d);
          material.emissiveIntensity = 0.07;
        } else if (materialName.includes('edge')) {
          material.map = null;
          material.color.setHex(0xffffff);
          material.metalness = 1;
          material.roughness = 0.07;
          material.emissive?.setHex(0x394550);
          material.emissiveIntensity = 0.12;
        } else if (materialName.includes('bevel')) {
          material.map = null;
          material.color.setHex(0xffffff);
          material.vertexColors = true;
          material.metalness = 0.91;
          material.roughness = 0.2;
          material.emissive?.setHex(0x2c1a04);
          material.emissiveIntensity = 0.1;
        } else {
          material.map = null;
          material.color.setHex(0x81542c);
          material.metalness = 0.88;
          material.roughness = 0.3;
          material.emissive?.setHex(0x1d1510);
          material.emissiveIntensity = 0.08;
        }

        if ('envMapIntensity' in material) material.envMapIntensity = objectType === 'at' ? 1.55 : 1.42;
        if ('clearcoat' in material) {
          material.clearcoat = objectType === 'sword' ? 0.5 : 0.4;
          material.clearcoatRoughness = objectType === 'sword' ? 0.13 : 0.18;
        }
        material.dithering = true;

        material.needsUpdate = true;
        return material;
      };

      child.material = Array.isArray(child.material)
        ? child.material.map(applyMaterial)
        : applyMaterial(child.material);
    });
  }

  async function initialiseStage(stage) {
    if (stage.dataset.initialised === 'true') return;
    stage.dataset.initialised = 'true';

    const objectType = getObjectType(stage);
    const config = MODEL_CONFIG[objectType];
    const { canvas, fallback } = getStageElements(stage);
    if (!canvas || !hasWebGLSupport()) {
      markStatic(stage, 'webgl-unavailable');
      return;
    }

    stage.dataset.status = 'loading';

    try {
      modulePromise ||= Promise.all([
        import('./vendor/three.module.min.js'),
        import('./vendor/GLTFLoader.js')
      ]);
      const [THREE, loaderModule] = await modulePromise;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = cinemaProfile.exposure * (objectType === 'at' ? 1.05 : 1.02);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(config.fieldOfView, 1, 0.1, 20);
      camera.position.set(0, 0, config.cameraZ);

      scene.add(new THREE.AmbientLight(0xffffff, config.ambient * 0.82));
      scene.add(new THREE.HemisphereLight(cinemaProfile.key, 0x72809a, 0.72));

      const keyLight = new THREE.DirectionalLight(cinemaProfile.key, config.key);
      keyLight.position.set(-2.5, 3.5, 4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(cinemaProfile.rim, config.rim * (objectType === 'sword' ? 1.35 : 1.12));
      rimLight.position.set(2.8, 0.5, 2.4);
      scene.add(rimLight);

      const lowerLight = new THREE.PointLight(objectType === 'at' ? 0xa96536 : cinemaProfile.rim, config.lower);
      lowerLight.position.set(0, -0.6, 2);
      scene.add(lowerLight);

      const frontLight = new THREE.PointLight(objectType === 'at' ? 0xffd27a : cinemaProfile.fill, objectType === 'sword' ? 1.15 : 0.82, 8, 1.35);
      frontLight.position.set(0.2, 0.65, 3.4);
      scene.add(frontLight);

      const loader = new loaderModule.GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.load(config.modelUrl, resolve, undefined, reject);
      });
      const model = gltf.scene || gltf.scenes?.[0];
      if (!model) throw new Error(`${config.name} scene is missing`);

      applyMetalFinish(THREE, objectType, model);

      const root = new THREE.Group();
      root.name = config.name;
      root.add(model);
      root.scale.setScalar(config.scale * cinemaProfile.scale);
      scene.add(root);
      stage.dataset.cinemaProfile = pageName;
      stage.dataset.materialSystem = objectType === 'sword' ? 'forged-gold-silver-v2' : 'blacksmith-quadrimetal-v2';

      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      const scrollMotion = { value: window.scrollY || 0, target: window.scrollY || 0 };
      let width = 1;
      let height = 1;
      let frame = 0;
      let lastTime = performance.now();
      let lastStatusUpdate = 0;
      let visible = true;

      function stopRendering() {
        if (!frame) return;
        window.cancelAnimationFrame(frame);
        frame = 0;
      }

      function startRendering() {
        if (frame || !visible || document.hidden) return;
        lastTime = performance.now();
        frame = window.requestAnimationFrame(render);
      }

      function resize() {
        const bounds = stage.getBoundingClientRect();
        width = Math.max(1, Math.round(bounds.width));
        height = Math.max(1, Math.min(Math.round(bounds.height), Math.round(window.innerHeight * 1.25)));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      function updatePointer(event) {
        pointer.targetX = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
        pointer.targetY = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
      }

      function resetPointer() {
        pointer.targetX = 0;
        pointer.targetY = 0;
      }

      function updateScroll() {
        scrollMotion.target = window.scrollY || 0;
      }

      function render(now) {
        frame = 0;
        if (!visible || document.hidden) {
          lastTime = now;
          return;
        }

        if (document.documentElement.classList.contains('tai-lightbox-open')) {
          lastTime = now;
          frame = window.requestAnimationFrame(render);
          return;
        }

        const delta = Math.min((now - lastTime) / 1000, 0.05);
        const elapsed = now / 1000;
        lastTime = now;
        const reduceMotion = reducedMotionQuery.matches;

        pointer.x = damp(pointer.x, reduceMotion ? 0 : pointer.targetX, 4, delta);
        pointer.y = damp(pointer.y, reduceMotion ? 0 : pointer.targetY, 4, delta);
        scrollMotion.value = damp(scrollMotion.value, reduceMotion ? 0 : scrollMotion.target, 5, delta);
        const scrollSpin = reduceMotion ? 0 : scrollMotion.value * 0.0042;
        const pointerSpin = reduceMotion ? 0 : pointer.x * Math.PI * 0.58;
        const scrollProgress = clamp(scrollMotion.value / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1), 0, 1);

        root.rotation.y = objectType === 'sword'
          ? (reduceMotion ? 0 : elapsed * 0.14) + pointerSpin + scrollSpin
          : pointer.x * config.maxYaw;
        root.rotation.x = -pointer.y * config.maxPitch;
        root.rotation.z = objectType === 'at'
          ? -(elapsed * 0.24 + scrollSpin + pointer.x * 0.34)
          : 0;
        root.position.x = config.offsetX;
        root.position.y = config.offsetY + (reduceMotion ? 0 : Math.sin(elapsed * 0.32) * 0.006);
        root.position.z = config.offsetZ;

        const breath = reduceMotion ? 1 : 1 + Math.sin(elapsed * 0.32) * 0.0025;
        root.scale.setScalar(config.scale * cinemaProfile.scale * breath);
        camera.position.x = reduceMotion ? 0 : pointer.x * cinemaProfile.cameraTravel;
        camera.position.y = reduceMotion ? 0 : (0.5 - scrollProgress) * cinemaProfile.cameraTravel;
        camera.position.z = config.cameraZ + (reduceMotion ? 0 : Math.sin(elapsed * 0.19) * cinemaProfile.cameraTravel * 0.22);
        camera.lookAt(0, 0, 0);
        if (!reduceMotion) {
          keyLight.position.x = -2.5 + pointer.x * 0.72;
          keyLight.position.y = 3.5 - pointer.y * 0.48;
          rimLight.position.x = 2.8 - pointer.x * 0.54;
          frontLight.position.x = 0.2 + Math.sin(elapsed * 0.27) * 0.32;
          frontLight.position.y = 0.65 + pointer.y * 0.2;
        }
        if (now - lastStatusUpdate >= 250) {
          lastStatusUpdate = now;
          stage.dataset.rotationX = root.rotation.x.toFixed(4);
          stage.dataset.rotationY = root.rotation.y.toFixed(4);
          stage.dataset.rotationZ = root.rotation.z.toFixed(4);
        }
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(render);
      }

      renderer.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        stopRendering();
        stage.dataset.status = 'static';
        canvas.style.opacity = '0';
        fallback?.removeAttribute('hidden');
      });

      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', updatePointer, { passive: true });
      window.addEventListener('pointerleave', resetPointer, { passive: true });
      window.addEventListener('scroll', updateScroll, { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopRendering();
        else startRendering();
      });

      if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stage);
      }

      if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) startRendering();
          else stopRendering();
        }, { threshold: 0.01 });
        visibilityObserver.observe(stage);
      }

      resize();
      stage.dataset.object = objectType;
      stage.dataset.model = config.modelUrl;
      stage.dataset.orientation = objectType === 'sword' ? 'y-up-front-facing' : 'z-facing-corner-signature';
      stage.dataset.motion = config.motion;
      stage.dataset.status = 'ready';
      canvas.style.opacity = '1';
      fallback?.setAttribute('hidden', '');
      startRendering();
    } catch (error) {
      stage.dataset.status = 'static';
      stage.dataset.error = error instanceof Error ? error.message.slice(0, 120) : `${objectType}-load-failed`;
    }
  }

  function schedule(stage) {
    enforceContainment(stage);

    if (reducedMotionQuery.matches) {
      markStatic(stage, 'reduced-motion');
      return;
    }

    if (constrainedConnection) {
      markStatic(stage, 'mobile-static');
      return;
    }

    if (compactQuery.matches || window.TAIYZUN_MOBILE_LITE) {
      stage.dataset.status = 'deferred';
      stage.dataset.performanceMode = 'mobile-deferred';

      const interactionEvents = ['pointerdown', 'touchstart', 'scroll', 'keydown'];
      const startAfterInteraction = () => {
        interactionEvents.forEach((eventName) => {
          window.removeEventListener(eventName, startAfterInteraction);
        });
        window.setTimeout(() => initialiseStage(stage), 120);
      };

      interactionEvents.forEach((eventName) => {
        window.addEventListener(eventName, startAfterInteraction, { passive: true, once: true });
      });
      return;
    }

    const start = () => {
      const run = () => initialiseStage(stage);
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 1800 });
      } else {
        window.setTimeout(run, 420);
      }
    };

    if (!('IntersectionObserver' in window)) {
      start();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    }, { rootMargin: '160px 0px', threshold: 0.01 });
    observer.observe(stage);
  }

  stages.forEach(schedule);

  let criticalChecks = 0;
  const signalCriticalReady = () => {
    const settled = stages.every((stage) => ['ready', 'static', 'deferred'].includes(stage.dataset.status));
    if (!settled && criticalChecks < 55) {
      criticalChecks += 1;
      window.setTimeout(signalCriticalReady, 40);
      return;
    }

    document.documentElement.dataset.tai3dCriticalReady = 'true';
    window.dispatchEvent(new CustomEvent('taiyzun:3d-critical-ready', {
      detail: { timedOut: !settled }
    }));
  };

  signalCriticalReady();
})();
