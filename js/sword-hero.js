(() => {
  const root = document.querySelector('[data-sword-hero]');
  if (!root || root.dataset.swordHeroReady === 'true') return;

  const canvas = root.querySelector('[data-sword-hero-canvas]');
  const fallback = root.querySelector('[data-sword-hero-fallback]');
  if (!canvas) return;

  root.dataset.swordHeroReady = 'true';
  root.dataset.status = 'loading';

  const hero = root.closest('.hero');
  const textureSrc = root.dataset.swordSrc || '/assets/images/taiyzun-sword-logo-2021.webp';
  const fallbackSrc = root.dataset.swordFallback || '/assets/images/taiyzun-sword-logo-2021.png';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse), (max-width: 820px)').matches;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const compactMode = Boolean(window.TAIYZUN_MOBILE_LITE || coarsePointer || (connection && connection.saveData));
  function detectLargeViewportMode() {
    const viewportArea = Math.max(window.innerWidth, 1) * Math.max(window.innerHeight, 1);
    const maxViewportSide = Math.max(window.innerWidth, window.innerHeight);
    return !compactMode && (viewportArea >= 1100000 || maxViewportSide >= 1440);
  }
  let largeViewportMode = detectLargeViewportMode();
  const secondHandSweepSpeed = (Math.PI * 2) / 60;

  let renderer = null;
  let scene = null;
  let camera = null;
  let swordGroup = null;
  let frameId = 0;
  let visible = true;
  let width = 1;
  let height = 1;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function setStatus(status) {
    root.dataset.status = status;
    if (hero) hero.dataset.swordReady = String(status === 'ready');
  }

  function showFallback() {
    setStatus('fallback');
    if (fallback) fallback.hidden = false;
  }

  function syncPerformanceMode() {
    largeViewportMode = detectLargeViewportMode();
    root.dataset.performanceMode = compactMode ? 'compact' : largeViewportMode ? 'large-viewport-smooth' : 'rich';
  }

  function loadTexture(THREE, src, backupSrc) {
    const loader = new THREE.TextureLoader();

    return new Promise((resolve, reject) => {
      loader.load(src, resolve, undefined, () => {
        if (!backupSrc || backupSrc === src) {
          reject(new Error('Sword texture failed'));
          return;
        }

        loader.load(backupSrc, resolve, undefined, () => reject(new Error('Sword fallback texture failed')));
      });
    });
  }

  function createAlphaExtrusionGeometry(THREE, image, objectWidth, objectHeight, depth) {
    const sourceWidth = image?.naturalWidth || image?.width || 0;
    const sourceHeight = image?.naturalHeight || image?.height || 0;
    if (!sourceWidth || !sourceHeight) return null;

    const sampleWidth = compactMode ? 96 : largeViewportMode ? 160 : 192;
    const sampleHeight = Math.max(1, Math.round(sampleWidth * (sourceHeight / sourceWidth)));
    const sampler = document.createElement('canvas');
    sampler.width = sampleWidth;
    sampler.height = sampleHeight;
    const context = sampler.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    try {
      context.clearRect(0, 0, sampleWidth, sampleHeight);
      context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    } catch (_) {
      return null;
    }

    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const solid = new Uint8Array(sampleWidth * sampleHeight);
    const alphaThreshold = 22;
    let solidPixels = 0;

    for (let i = 0; i < solid.length; i += 1) {
      const alpha = pixels[i * 4 + 3];
      if (alpha > alphaThreshold) {
        solid[i] = 1;
        solidPixels += 1;
      }
    }

    if (!solidPixels) return null;

    const positions = [];
    const normals = [];
    const zFront = depth * 0.5;
    const zBack = -depth * 0.5;
    const xAt = (x) => (x / sampleWidth - 0.5) * objectWidth;
    const yAt = (y) => (0.5 - y / sampleHeight) * objectHeight;
    const isSolid = (x, y) => x >= 0 && x < sampleWidth && y >= 0 && y < sampleHeight && solid[y * sampleWidth + x];

    const addQuad = (a, b, c, d, normal) => {
      [a, b, c, a, c, d].forEach((point) => {
        positions.push(point[0], point[1], point[2]);
        normals.push(normal[0], normal[1], normal[2]);
      });
    };

    let edgeSegments = 0;

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        if (!isSolid(x, y)) continue;

        const x0 = xAt(x);
        const x1 = xAt(x + 1);
        const y0 = yAt(y);
        const y1 = yAt(y + 1);

        if (!isSolid(x - 1, y)) {
          addQuad([x0, y0, zFront], [x0, y1, zFront], [x0, y1, zBack], [x0, y0, zBack], [-1, 0, 0]);
          edgeSegments += 1;
        }

        if (!isSolid(x + 1, y)) {
          addQuad([x1, y1, zFront], [x1, y0, zFront], [x1, y0, zBack], [x1, y1, zBack], [1, 0, 0]);
          edgeSegments += 1;
        }

        if (!isSolid(x, y - 1)) {
          addQuad([x1, y0, zFront], [x0, y0, zFront], [x0, y0, zBack], [x1, y0, zBack], [0, 1, 0]);
          edgeSegments += 1;
        }

        if (!isSolid(x, y + 1)) {
          addQuad([x0, y1, zFront], [x1, y1, zFront], [x1, y1, zBack], [x0, y1, zBack], [0, -1, 0]);
          edgeSegments += 1;
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.computeBoundingSphere();
    geometry.userData.edgeSegments = edgeSegments;
    geometry.userData.sample = `${sampleWidth}x${sampleHeight}`;
    geometry.userData.solidPixels = solidPixels;
    return geometry;
  }

  function resize() {
    if (!renderer || !camera) return;
    syncPerformanceMode();

    const rect = root.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
    height = Math.max(1, Math.round(rect.height || window.innerHeight || 1));

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactMode ? 1.35 : largeViewportMode ? 1.2 : 1.75));

    camera.aspect = width / height;
    camera.position.z = width < 760 ? 7.55 : 6.75;
    camera.updateProjectionMatrix();

    if (swordGroup) {
      swordGroup.position.x = width < 760 ? 0 : 1.28;
      swordGroup.position.y = width < 760 ? 0.62 : -0.08;
      swordGroup.scale.setScalar(width < 760 ? 0.86 : 1);
    }
  }

  function animate(now = 0) {
    frameId = window.requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !swordGroup || !visible) return;

    const t = now * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.055;
    pointer.y += (pointer.ty - pointer.y) * 0.055;

    const baseYaw = compactMode ? -0.18 : -0.28;
    const spin = reduceMotion ? 0.14 : t * secondHandSweepSpeed;
    swordGroup.rotation.y = baseYaw + spin + pointer.x * 0.18;
    swordGroup.rotation.x = Math.sin(t * secondHandSweepSpeed * 1.35) * 0.035 - pointer.y * 0.06;
    swordGroup.rotation.z = Math.sin(t * secondHandSweepSpeed * 0.82) * 0.018;
    swordGroup.position.z = Math.sin(t * secondHandSweepSpeed * 1.55) * 0.05;

    root.dataset.rotationY = swordGroup.rotation.y.toFixed(3);
    renderer.render(scene, camera);
  }

  async function init() {
    try {
      const THREE = await import('./vendor/three.module.min.js');

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !(compactMode || largeViewportMode),
        powerPreference: compactMode ? 'low-power' : 'high-performance'
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);

      scene.add(new THREE.AmbientLight(0xffedbf, 1.45));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(3.2, 4.1, 5.5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xd3a64b, 1.15);
      rimLight.position.set(-4.5, 1.6, -3.5);
      scene.add(rimLight);

      const texture = await loadTexture(THREE, textureSrc, fallbackSrc);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const imageWidth = texture.image?.naturalWidth || texture.image?.width || 1100;
      const imageHeight = texture.image?.naturalHeight || texture.image?.height || 1650;
      const aspect = imageWidth / Math.max(imageHeight, 1);
      const objectHeight = 4.95;
      const objectWidth = objectHeight * aspect;

      swordGroup = new THREE.Group();
      swordGroup.name = 'TaiyzunSwordHero';

      const objectDepth = compactMode ? 0.24 : 0.34;
      const faceGeometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 1, 1);
      const frontMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.035,
        metalness: 0.34,
        roughness: 0.36,
        side: THREE.FrontSide
      });

      const backMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xd0a339,
        transparent: true,
        alphaTest: 0.035,
        opacity: 0.72,
        metalness: 0.48,
        roughness: 0.34,
        side: THREE.FrontSide
      });

      const sideMaterial = new THREE.MeshStandardMaterial({
        color: 0xbe8e19,
        metalness: 0.72,
        roughness: 0.28,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide
      });

      const face = new THREE.Mesh(faceGeometry, frontMaterial);
      face.position.z = objectDepth * 0.5 + 0.006;
      swordGroup.add(face);

      const back = new THREE.Mesh(faceGeometry.clone(), backMaterial);
      back.rotation.y = Math.PI;
      back.position.z = -objectDepth * 0.5 - 0.006;
      swordGroup.add(back);

      const sideGeometry = createAlphaExtrusionGeometry(THREE, texture.image, objectWidth, objectHeight, objectDepth);
      if (sideGeometry) {
        const side = new THREE.Mesh(sideGeometry, sideMaterial);
        side.name = 'TaiyzunSwordAlphaExtrusion';
        swordGroup.add(side);

        root.dataset.geometry = 'alpha-extruded-silhouette';
        root.dataset.depth = objectDepth.toFixed(2);
        root.dataset.edgeSegments = String(sideGeometry.userData.edgeSegments || 0);
        root.dataset.alphaSample = sideGeometry.userData.sample || '';
      } else {
        root.dataset.geometry = 'front-back-depth-fallback';
      }

      scene.add(swordGroup);
      resize();
      setStatus('ready');
      root.dataset.texture = textureSrc;
      root.dataset.object = 'taiyzun-sword-logo-2021';
      syncPerformanceMode();
      root.dataset.lighting = 'ambient-directional-rim';
      root.dataset.motion = reduceMotion ? 'reduced-y-axis' : 'smooth-second-hand-y-axis-rotation';

      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', (event) => {
        if (reduceMotion) return;
        pointer.tx = Math.max(-1, Math.min(1, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2));
        pointer.ty = Math.max(-1, Math.min(1, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2));
      }, { passive: true });

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
        }, { threshold: 0.02 });
        observer.observe(root);
      }

      animate();
    } catch (error) {
      root.dataset.error = 'sword-hero-webgl';
      showFallback();
    }
  }

  init();
})();
