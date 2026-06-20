const doc = document;
const body = doc.body;

if (body && body.dataset.taiyzun3dReady !== 'true') {
  body.dataset.taiyzun3dReady = 'true';
  body.classList.add('taiyzun-3d-ready');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const mobileViewport = window.matchMedia('(max-width: 820px)').matches;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const compactMode = Boolean(window.TAIYZUN_MOBILE_LITE || coarsePointer || mobileViewport || (connection && connection.saveData));
  const root = doc.createElement('div');
  const canvas = doc.createElement('canvas');

  root.className = 'taiyzun-3d-field';
  root.setAttribute('aria-hidden', 'true');
  root.dataset.status = 'loading';
  canvas.className = 'taiyzun-3d-field__canvas';
  root.appendChild(canvas);
  body.insertBefore(root, body.firstChild);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function detectPage() {
    const path = window.location.pathname.toLowerCase();
    if (body.classList.contains('journey-page') || path.includes('journey')) return 'journey';
    if (body.classList.contains('creations-page') || path.includes('creations')) return 'creations';
    if (body.classList.contains('odyssey-page') || path.includes('odyssey')) return 'odyssey';
    if (body.classList.contains('connect-page') || path.includes('connect')) return 'connect';
    if (path.includes('404') || path.includes('500')) return 'error';
    return 'home';
  }

  const page = detectPage();
  const themes = {
    home: { node: 0xcaa854, line: 0x6e8987, accent: 0xf3df9a, radius: 5.4 },
    journey: { node: 0xb99148, line: 0x6d8481, accent: 0xf0d98d, radius: 5.7 },
    creations: { node: 0xd0a84f, line: 0x9c7d9a, accent: 0xf6d270, radius: 5.2 },
    odyssey: { node: 0xcaa854, line: 0x77789b, accent: 0xf0d98d, radius: 5.6 },
    connect: { node: 0xcaa854, line: 0x5d8a84, accent: 0xf3df9a, radius: 5.0 },
    error: { node: 0xe0bf67, line: 0xb7a16a, accent: 0xf7e5a3, radius: 4.8 }
  };
  const theme = themes[page] || themes.home;
  const decorativeTextureAssets = [
    'assets/decorative/optimized/decor-01-6064707a18-384.webp',
    'assets/decorative/optimized/decor-02-1e4b1392b1-384.webp',
    'assets/decorative/optimized/decor-03-10841040b6-384.webp',
    'assets/decorative/optimized/decor-04-abc334266c-384.webp',
    'assets/decorative/optimized/decor-07-875a39f87e-384.webp',
    'assets/decorative/optimized/decor-08-e38790efe1-384.webp',
    'assets/decorative/optimized/decor-11-003dbf7e69-384.webp',
    'assets/decorative/optimized/decor-12-f1ef6d07f1-384.webp',
    'assets/decorative/optimized/decor-15-01151cb738-384.webp',
    'assets/decorative/optimized/decor-16-6807d17293-384.webp',
    'assets/decorative/optimized/decor-17-2cd6df39a1-384.webp',
    'assets/decorative/optimized/decor-18-040c814e89-384.webp',
    'assets/decorative/optimized/decor-29-a08899d7c9-384.webp',
    'assets/decorative/optimized/decor-30-501b7ecb96-384.webp',
    'assets/decorative/optimized/decor-33-ca240ea221-384.webp',
    'assets/decorative/optimized/decor-38-0700e4820b-384.webp',
    'assets/decorative/optimized/decor-41-cfc044c50c-384.webp',
    'assets/decorative/optimized/decor-45-dbdcffeb8e-384.webp',
    'assets/decorative/optimized/decor-47-45ddd777ac-384.webp',
    'assets/decorative/optimized/decor-48-bb8cc65c4a-384.webp',
    'assets/decorative/optimized/decor-49-eabf0a16e7-384.webp'
  ];
  const shiftSurfaces = new Set();
  const shiftPointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let shiftFrame = 0;

  function scheduleKineticShifts() {
    if (reduceMotion || shiftFrame) return;
    shiftFrame = window.requestAnimationFrame(updateKineticShifts);
  }

  function updateKineticShifts() {
    shiftFrame = 0;
    shiftPointer.x += (shiftPointer.tx - shiftPointer.x) * 0.09;
    shiftPointer.y += (shiftPointer.ty - shiftPointer.y) * 0.09;

    const viewportHeight = Math.max(window.innerHeight, 1);
    const viewportCenter = viewportHeight * 0.5;
    let activeCount = 0;

    shiftSurfaces.forEach((node) => {
      if (!node.isConnected) {
        shiftSurfaces.delete(node);
        return;
      }

      const rect = node.getBoundingClientRect();
      if (rect.bottom < -viewportHeight * 0.35 || rect.top > viewportHeight * 1.35) {
        node.style.setProperty('--tz3d-shift-x', '0px');
        node.style.setProperty('--tz3d-shift-y', '0px');
        node.style.setProperty('--tz3d-shift-r', '0deg');
        return;
      }

      const center = rect.top + rect.height * 0.5;
      const distance = clamp((center - viewportCenter) / viewportHeight, -1.35, 1.35);
      const presence = clamp(1 - Math.abs(distance) / 1.2, 0, 1);
      const seed = Number(node.dataset.tz3dSeed || 0);
      const direction = seed % 2 ? 1 : -1;
      const isHero = node.matches('.hero-content, .page-hero-content, .about-grid, .gallery-label, .connect-label');
      const isDense = node.matches('.art-item, .gallery-item, .cat-tab, .home-btn');
      const amplitude = isHero ? (compactMode ? 20 : 30) : isDense ? (compactMode ? 9 : 14) : (compactMode ? 12 : 18);
      const shiftX = (direction * presence * amplitude * 0.18 + shiftPointer.x * presence * amplitude * 0.28).toFixed(2);
      const shiftY = (-distance * presence * amplitude + shiftPointer.y * presence * amplitude * 0.18).toFixed(2);
      const shiftR = (direction * presence * 0.16 + shiftPointer.x * presence * 0.055).toFixed(3);

      node.style.setProperty('--tz3d-shift-x', `${shiftX}px`);
      node.style.setProperty('--tz3d-shift-y', `${shiftY}px`);
      node.style.setProperty('--tz3d-shift-r', `${shiftR}deg`);
      activeCount += presence > 0.02 ? 1 : 0;
    });

    root.dataset.shiftSurfaces = String(activeCount);

    if (Math.abs(shiftPointer.tx - shiftPointer.x) > 0.002 || Math.abs(shiftPointer.ty - shiftPointer.y) > 0.002) {
      scheduleKineticShifts();
    }
  }

  function attachSurfaceDepth() {
    const selector = [
      '.hero-content', '.page-hero-content', '.about-grid', '.highlight-card', '.thesis-card',
      '.value-item', '.timeline-category', '.timeline-item', '.gallery-label', '.connect-label',
      '.contact-form', '.social-card', '.info-card', '.cat-tab', '.art-item', '.gallery-item', '.home-btn'
    ].join(',');

    doc.querySelectorAll(selector).forEach((node, index) => {
      if (node.dataset.tz3dSurface === 'true') return;
      node.dataset.tz3dSurface = 'true';
      node.dataset.tz3dSeed = String(index % 11);
      node.classList.add('tz3d-surface', 'tz3d-shift');
      shiftSurfaces.add(node);

      const update = (event) => {
        if (reduceMotion) return;
        const rect = node.getBoundingClientRect();
        const localX = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
        const localY = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
        const strength = node.matches('.hero-content, .page-hero-content, .about-grid') ? 4.6 : 7.4;
        const lift = node.matches('.art-item, .gallery-item') ? 22 : 13;
        const tiltX = (0.5 - localY) * strength;
        const tiltY = (localX - 0.5) * strength;

        node.classList.add('tz3d-hover');
        node.style.setProperty('--tz3d-x', `${(localX * 100).toFixed(2)}%`);
        node.style.setProperty('--tz3d-y', `${(localY * 100).toFixed(2)}%`);
        node.style.transform = `perspective(1200px) rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) translate3d(0, 0, ${lift}px)`;
      };

      const reset = () => {
        node.classList.remove('tz3d-hover');
        node.style.transform = '';
      };

      node.addEventListener('pointermove', update, { passive: true });
      node.addEventListener('pointerleave', reset);
      node.addEventListener('pointercancel', reset);
    });

    scheduleKineticShifts();
  }

  attachSurfaceDepth();
  window.addEventListener('scroll', scheduleKineticShifts, { passive: true });
  window.addEventListener('resize', scheduleKineticShifts, { passive: true });
  window.addEventListener('pointermove', (event) => {
    if (reduceMotion) return;
    shiftPointer.tx = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
    shiftPointer.ty = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
    scheduleKineticShifts();
  }, { passive: true });

  if ('MutationObserver' in window) {
    new MutationObserver(() => window.requestAnimationFrame(attachSurfaceDepth)).observe(body, {
      childList: true,
      subtree: true
    });
  }

  async function startThreeField() {
    try {
    const THREE = await import('./vendor/three.module.min.js');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !compactMode,
      powerPreference: compactMode ? 'low-power' : 'high-performance',
      preserveDrawingBuffer: true
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    const field = new THREE.Group();
    const macro = new THREE.Group();
    const micro = new THREE.Group();
    const decor = new THREE.Group();
    const decorObjects = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const quality = compactMode ? 0.58 : 1;
    let frame = 0;
    let running = true;
    let width = 1;
    let height = 1;

    scene.add(field);
    field.add(macro);
    field.add(micro);
    field.add(decor);
    camera.position.set(0, 0, compactMode ? 10.5 : 9.2);
    renderer.setClearColor(0x000000, 0);

    const pointCount = compactMode ? 90 : 220;
    const positions = new Float32Array(pointCount * 3);
    const colours = new Float32Array(pointCount * 3);
    const colour = new THREE.Color(theme.node);
    const accent = new THREE.Color(theme.accent);
    const lineColour = new THREE.Color(theme.line);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < pointCount; i += 1) {
      const t = i / Math.max(pointCount - 1, 1);
      const angle = i * goldenAngle;
      const radius = Math.sqrt(t) * theme.radius * (0.72 + 0.18 * Math.sin(i * 0.31));
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.68;
      positions[i * 3 + 2] = Math.sin(angle * 0.54 + page.length) * 1.45 + (t - 0.5) * 1.1;

      const mixed = colour.clone().lerp(accent, (Math.sin(i * 0.19) + 1) * 0.28);
      colours[i * 3] = mixed.r;
      colours[i * 3 + 1] = mixed.g;
      colours[i * 3 + 2] = mixed.b;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const points = new THREE.Points(
      pointGeometry,
      new THREE.PointsMaterial({
        size: compactMode ? 0.038 : 0.052,
        vertexColors: true,
        transparent: true,
        opacity: compactMode ? 0.42 : 0.54,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    micro.add(points);

    const linePositions = [];
    const lineStride = compactMode ? 10 : 7;
    for (let i = 0; i < pointCount - lineStride; i += lineStride) {
      const a = i * 3;
      const b = (i + lineStride) * 3;
      linePositions.push(
        positions[a], positions[a + 1], positions[a + 2],
        positions[b], positions[b + 1], positions[b + 2]
      );
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const network = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: lineColour,
        transparent: true,
        opacity: compactMode ? 0.11 : 0.16,
        depthWrite: false
      })
    );
    micro.add(network);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: theme.node,
      transparent: true,
      opacity: compactMode ? 0.09 : 0.125,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const rings = compactMode ? 3 : 5;
    for (let i = 0; i < rings; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.42 + i * 0.88, 0.006 + i * 0.0018, 8, 128),
        ringMaterial.clone()
      );
      ring.rotation.set(Math.PI / (2.7 + i * 0.21), i * 0.42, i * 0.18);
      ring.position.z = -1.1 + i * 0.42;
      macro.add(ring);
    }

    const planeGeometry = new THREE.PlaneGeometry(7.2, 4.2, 1, 1);
    const edgeGeometry = new THREE.EdgesGeometry(planeGeometry);
    for (let i = 0; i < (compactMode ? 2 : 4); i += 1) {
      const plane = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({
          color: i % 2 ? theme.line : theme.node,
          transparent: true,
          opacity: compactMode ? 0.055 : 0.075,
          depthWrite: false
        })
      );
      plane.rotation.set(0.52 + i * 0.18, 0.2 - i * 0.16, 0.28 + i * 0.37);
      plane.position.set((i - 1.5) * 0.8, (i % 2 ? 0.9 : -0.55), -2.1 - i * 0.5);
      macro.add(plane);
    }

    const textureLoader = new THREE.TextureLoader();
    const decorSlots = [
      [-5.95, 2.48, -2.65, 0.78, -0.1, 0.46, -0.18],
      [5.72, 2.08, -3.1, 0.72, 0.08, -0.52, 0.16],
      [-5.35, -2.15, -2.85, 0.72, 0.18, 0.58, 0.1],
      [5.42, -2.32, -3.2, 0.84, -0.18, -0.48, -0.12],
      [-2.84, 3.18, -3.45, 0.58, 0.24, 0.32, 0.22],
      [2.92, 3.02, -3.62, 0.6, -0.22, -0.28, -0.24],
      [-2.58, -3.06, -3.35, 0.58, -0.22, 0.3, -0.2],
      [2.68, -3.12, -3.55, 0.6, 0.22, -0.32, 0.2],
      [0.0, 3.42, -4.12, 0.5, -0.28, 0.08, 0.28],
      [0.12, -3.42, -4.2, 0.5, 0.26, -0.08, -0.3],
      [-6.28, 0.18, -4.0, 0.54, 0.06, 0.72, -0.08],
      [6.18, -0.1, -4.05, 0.54, -0.06, -0.72, 0.08],
      [-4.34, 1.0, -4.55, 0.42, 0.34, 0.44, 0.32],
      [4.28, -1.0, -4.48, 0.42, -0.34, -0.44, -0.32]
    ];

    function selectDecorativeAssets() {
      const count = compactMode ? 6 : 14;
      const seed = page.split('').reduce((total, letter) => total + letter.charCodeAt(0), 0);
      const selected = [];

      for (let i = 0; i < count; i += 1) {
        const index = (seed + i * 5 + Math.floor(i / 3) * 2) % decorativeTextureAssets.length;
        selected.push(decorativeTextureAssets[index]);
      }

      return selected;
    }

    function addDecorativeObjects() {
      const selectedAssets = selectDecorativeAssets();
      const accentMaterialColour = new THREE.Color(theme.accent);
      const inkMaterialColour = new THREE.Color(0xffffff).lerp(accentMaterialColour, 0.22);

      selectedAssets.forEach((asset, index) => {
        textureLoader.load(asset, (texture) => {
          if (THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }

          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), compactMode ? 4 : 8);

          const sourceSlot = decorSlots[index % decorSlots.length];
          const slot = compactMode
            ? [
                clamp(sourceSlot[0] * 0.38, -2.18, 2.18),
                clamp(sourceSlot[1] * 0.78, -3.22, 3.22),
                sourceSlot[2] + 0.38,
                sourceSlot[3] * 1.08,
                sourceSlot[4] * 0.72,
                sourceSlot[5] * 0.62,
                sourceSlot[6]
              ]
            : sourceSlot;
          const imageWidth = texture.image && texture.image.width ? texture.image.width : 384;
          const imageHeight = texture.image && texture.image.height ? texture.image.height : 384;
          const aspect = clamp(imageWidth / Math.max(imageHeight, 1), 0.34, 2.7);
          const baseScale = slot[3] * (compactMode ? 0.9 : 1);
          const objectWidth = baseScale * Math.sqrt(aspect);
          const objectHeight = baseScale / Math.sqrt(aspect);
          const geometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 2, 2);
          const group = new THREE.Group();
          const auraMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: theme.accent,
            transparent: true,
            opacity: compactMode ? 0.16 : 0.14,
            alphaTest: 0.025,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          });
          const shadowMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0x5f4a22,
            transparent: true,
            opacity: compactMode ? 0.085 : 0.075,
            alphaTest: 0.025,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const faceMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            color: inkMaterialColour,
            transparent: true,
            opacity: compactMode ? 0.42 : 0.36,
            alphaTest: 0.035,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const aura = new THREE.Mesh(geometry, auraMaterial);
          const shadow = new THREE.Mesh(geometry, shadowMaterial);
          const face = new THREE.Mesh(geometry, faceMaterial);

          aura.scale.setScalar(1.08);
          aura.position.z = -0.045;
          shadow.scale.setScalar(1.035);
          shadow.position.set(0.035, -0.045, -0.03);
          face.position.z = 0.025;
          group.add(aura);
          group.add(shadow);
          group.add(face);
          group.position.set(slot[0], slot[1], slot[2]);
          group.rotation.set(slot[4], slot[5], slot[6]);
          group.userData = {
            baseX: slot[0],
            baseY: slot[1],
            baseZ: slot[2],
            baseRotX: slot[4],
            baseRotY: slot[5],
            baseRotZ: slot[6],
            phase: index * 0.74 + page.length,
            sway: 0.045 + (index % 4) * 0.012,
            pointer: 0.16 + (index % 5) * 0.035
          };

          decorObjects.push(group);
          decor.add(group);
          root.dataset.decor3d = String(decorObjects.length);
        }, undefined, () => {
          root.dataset.decor3dErrors = String((Number(root.dataset.decor3dErrors) || 0) + 1);
        });
      });
    }

    addDecorativeObjects();

    function resize() {
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, compactMode ? 1.15 : 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = compactMode ? 10.8 : 9.2;
      camera.updateProjectionMatrix();
    }

    function render(now = 0) {
      if (!running) return;
      frame += 1;
      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;

      const scrollRatio = window.scrollY / Math.max(window.innerHeight, 1);
      const time = now * 0.001;
      const speed = reduceMotion ? 0 : 1;
      root.style.setProperty('--tz3d-field-x', `${(pointer.x * 8).toFixed(2)}px`);
      root.style.setProperty('--tz3d-field-y', `${(pointer.y * 6).toFixed(2)}px`);

      field.rotation.x = pointer.y * 0.035 + Math.sin(time * 0.18) * 0.012 * speed;
      field.rotation.y = pointer.x * 0.052 + scrollRatio * 0.035 + Math.cos(time * 0.16) * 0.016 * speed;
      field.rotation.z = Math.sin(time * 0.12 + page.length) * 0.014 * speed;
      macro.rotation.z = time * 0.018 * speed + scrollRatio * 0.02;
      micro.rotation.y = -time * 0.024 * speed + pointer.x * 0.024;
      points.material.opacity = (compactMode ? 0.38 : 0.5) + Math.sin(time * 0.9) * 0.035 * speed;

      decor.rotation.x = pointer.y * 0.025 + Math.sin(time * 0.12) * 0.01 * speed;
      decor.rotation.y = pointer.x * 0.075 + scrollRatio * 0.045 + Math.cos(time * 0.11) * 0.014 * speed;
      decor.rotation.z = Math.sin(time * 0.09 + page.length) * 0.01 * speed;

      decorObjects.forEach((object, index) => {
        const data = object.userData;
        const phase = data.phase + time * (0.22 + index * 0.006) * speed;
        const pointerDepth = data.pointer;
        object.position.x = data.baseX + pointer.x * pointerDepth * 1.4 + Math.sin(phase) * data.sway;
        object.position.y = data.baseY + pointer.y * pointerDepth * 0.95 + Math.cos(phase * 0.8) * data.sway * 0.72;
        object.position.z = data.baseZ + Math.sin(phase * 0.66) * 0.1 - scrollRatio * 0.035;
        object.rotation.x = data.baseRotX + pointer.y * 0.12 + Math.cos(phase * 0.74) * 0.035 * speed;
        object.rotation.y = data.baseRotY + pointer.x * 0.18 + Math.sin(phase * 0.67) * 0.045 * speed;
        object.rotation.z = data.baseRotZ + Math.sin(phase * 0.9) * 0.028 * speed;
      });

      renderer.render(scene, camera);
      root.dataset.status = 'ready';
      root.dataset.frame = String(frame);
      if (!reduceMotion || frame < 3) window.requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      pointer.tx = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
      pointer.ty = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
    }, { passive: true });
    doc.addEventListener('visibilitychange', () => {
      running = !doc.hidden;
      if (running) window.requestAnimationFrame(render);
    });

    resize();
    window.requestAnimationFrame(render);
    } catch (_) {
      root.dataset.status = 'fallback';
    }
  }

  function scheduleThreeField() {
    const run = () => {
      const delay = compactMode ? 900 : 1300;
      window.setTimeout(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(startThreeField, { timeout: 2400 });
        } else {
          startThreeField();
        }
      }, delay);
    };

    if (doc.readyState === 'complete') {
      run();
    } else {
      window.addEventListener('load', run, { once: true });
    }
  }

  scheduleThreeField();
}
