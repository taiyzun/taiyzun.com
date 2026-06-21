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

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function hashString(value) {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed || 1;

    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
    'assets/decorative/optimized/decor-05-c2da58b2fd-384.webp',
    'assets/decorative/optimized/decor-06-28c436cfc5-384.webp',
    'assets/decorative/optimized/decor-07-875a39f87e-384.webp',
    'assets/decorative/optimized/decor-08-e38790efe1-384.webp',
    'assets/decorative/optimized/decor-09-aabafc3ad6-384.webp',
    'assets/decorative/optimized/decor-10-1af9d19f49-384.webp',
    'assets/decorative/optimized/decor-11-003dbf7e69-384.webp',
    'assets/decorative/optimized/decor-12-f1ef6d07f1-384.webp',
    'assets/decorative/optimized/decor-13-2a4b750a8f-384.webp',
    'assets/decorative/optimized/decor-14-d8bf4299fe-384.webp',
    'assets/decorative/optimized/decor-15-01151cb738-384.webp',
    'assets/decorative/optimized/decor-16-6807d17293-384.webp',
    'assets/decorative/optimized/decor-17-2cd6df39a1-384.webp',
    'assets/decorative/optimized/decor-18-040c814e89-384.webp',
    'assets/decorative/optimized/decor-19-0c8700e627-384.webp',
    'assets/decorative/optimized/decor-20-9f288534be-384.webp',
    'assets/decorative/optimized/decor-21-ffedf25a3b-384.webp',
    'assets/decorative/optimized/decor-22-55bbdfde65-384.webp',
    'assets/decorative/optimized/decor-23-80d41399a1-384.webp',
    'assets/decorative/optimized/decor-24-9b29cd9f26-384.webp',
    'assets/decorative/optimized/decor-25-5bc8d42695-384.webp',
    'assets/decorative/optimized/decor-26-8b2d2d5932-384.webp',
    'assets/decorative/optimized/decor-27-3357d45ec6-384.webp',
    'assets/decorative/optimized/decor-28-684378f719-384.webp',
    'assets/decorative/optimized/decor-29-a08899d7c9-384.webp',
    'assets/decorative/optimized/decor-30-501b7ecb96-384.webp',
    'assets/decorative/optimized/decor-31-c58de465b8-384.webp',
    'assets/decorative/optimized/decor-32-87d403a230-384.webp',
    'assets/decorative/optimized/decor-33-ca240ea221-384.webp',
    'assets/decorative/optimized/decor-34-6fc12fdb8c-384.webp',
    'assets/decorative/optimized/decor-35-6202c3a156-384.webp',
    'assets/decorative/optimized/decor-36-598e9f2098-384.webp',
    'assets/decorative/optimized/decor-37-11f1e47b15-384.webp',
    'assets/decorative/optimized/decor-38-0700e4820b-384.webp',
    'assets/decorative/optimized/decor-39-cc91bc241e-384.webp',
    'assets/decorative/optimized/decor-40-580000a6de-384.webp',
    'assets/decorative/optimized/decor-41-cfc044c50c-384.webp',
    'assets/decorative/optimized/decor-42-c3cdf9ce50-384.webp',
    'assets/decorative/optimized/decor-43-6337a4ecb2-384.webp',
    'assets/decorative/optimized/decor-44-80b2d62546-384.webp',
    'assets/decorative/optimized/decor-45-dbdcffeb8e-384.webp',
    'assets/decorative/optimized/decor-46-171f84453f-384.webp',
    'assets/decorative/optimized/decor-47-45ddd777ac-384.webp',
    'assets/decorative/optimized/decor-48-bb8cc65c4a-384.webp',
    'assets/decorative/optimized/decor-49-eabf0a16e7-384.webp'
  ];
  const decorativeAssetFamilies = {
    1: 'liberty-ball',
    2: 'tz-mark',
    3: 'tz-mark',
    4: 'tz-mark',
    5: 'breath-vertical',
    6: 'breath-sting',
    7: 'breath-layer',
    8: 'breath-layer',
    9: 'breath-layer',
    10: 'breath-layer',
    11: 'hearts',
    12: 'namesis',
    13: 'sword',
    14: 'yoda',
    15: 'logo',
    16: 'suits',
    17: 'earth',
    18: 'ganesh',
    19: 'portrait',
    20: 'infinity',
    21: 'me-mark',
    22: 'me-mark',
    23: 'me-mark',
    24: 'me-mark',
    25: 'me-mark',
    26: 'logo',
    27: 'logo',
    28: 'logo',
    29: 'sword',
    30: 'sword',
    31: 'sword',
    32: 'aeone',
    33: 'earth',
    34: 'namesis',
    35: 'breath-sting',
    36: 'suits',
    37: 'logo',
    38: 'diya',
    39: 'earth',
    40: 'epoch',
    41: 'ganesh',
    42: 'hearts',
    43: 'hearts',
    44: 'logo',
    45: 'signature',
    46: 'star',
    47: 'breath-sting',
    48: 'sword',
    49: 'infinity'
  };
  const shiftSurfaces = new Set();
  const shiftPointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let shiftFrame = 0;

  function decorativeAssetNumber(asset) {
    const match = String(asset).match(/decor-(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function decorativeAssetFamily(asset) {
    const number = decorativeAssetNumber(asset);
    return decorativeAssetFamilies[number] || `decor-${number || 'unknown'}`;
  }

  function hasNearbyDecorativeFamily(asset, selected, radius) {
    const family = decorativeAssetFamily(asset);
    return selected.slice(Math.max(0, selected.length - radius)).some((selectedAsset) => decorativeAssetFamily(selectedAsset) === family);
  }

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
      const amplitude = isHero ? (compactMode ? 8 : 30) : isDense ? (compactMode ? 3 : 14) : (compactMode ? 4 : 18);
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
      '.contact-form', '.social-card', '.info-card', '.cat-tab', '.art-item', '.gallery-item', '.home-btn',
      '.video-field-shell', '.video-stage', '.video-frame', '.video-panel'
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
    const decorObjectsByIndex = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const quality = compactMode ? 0.58 : 1;
    let liquidLinks = null;
    let liquidLinkPositions = null;
    let liquidLinkGeometry = null;
    let liquidLinkMaterial = null;
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

    function buildScatterSlot(index) {
      const source = decorSlots[index % decorSlots.length];
      if (index < decorSlots.length) {
        if (page === 'home') {
          return [
            source[0] * 0.96,
            source[1] * 0.94,
            source[2] + 0.28,
            source[3] * 1.22,
            source[4] * 0.32,
            source[5] * 0.32,
            source[6] * 0.72
          ];
        }

        if (page !== 'odyssey') {
          return [
            source[0] * 0.98,
            source[1] * 0.98,
            source[2] + 0.16,
            source[3] * 1.08,
            source[4] * 0.46,
            source[5] * 0.46,
            source[6] * 0.82
          ];
        }

        return source;
      }

      const angle = index * goldenAngle + page.length * 0.23;
      const radiusX = compactMode ? 2.22 : 5.86;
      const radiusY = compactMode ? 3.18 : 3.08;
      const edgePull = 0.82 + (index % 4) * 0.06;

      return [
        Math.cos(angle) * radiusX * edgePull,
        Math.sin(angle * 1.17) * radiusY,
        -3.02 - (index % 6) * 0.34,
        (0.4 + (index % 5) * 0.054) * (page === 'home' ? 1.1 : 1),
        Math.sin(angle) * (page === 'odyssey' ? 0.28 : 0.12),
        Math.cos(angle * 0.9) * (page === 'odyssey' ? 0.62 : 0.22),
        Math.sin(angle * 1.33) * (page === 'odyssey' ? 0.34 : 0.2)
      ];
    }

    function buildSphereSlot(index, total) {
      const offset = 2 / Math.max(total, 1);
      const y = index * offset - 1 + offset * 0.5;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = index * goldenAngle + page.length * 0.41;
      const radius = compactMode ? 2.22 : 3.36;
      const sphereCenterZ = compactMode ? -2.42 : -2.74;

      return {
        x: Math.cos(theta) * radiusAtY * radius,
        y: y * radius * (compactMode ? 1.18 : 0.78),
        z: sphereCenterZ + Math.sin(theta) * radiusAtY * radius * 0.58,
        centerZ: sphereCenterZ,
        theta
      };
    }

    function selectDecorativeAssets() {
      const count = compactMode ? Math.min(18, decorativeTextureAssets.length) : decorativeTextureAssets.length;
      const seed = page.split('').reduce((total, letter) => total + letter.charCodeAt(0), 0);
      const selected = [];
      const groups = new Map();
      const spacingRadius = compactMode ? 3 : 4;

      decorativeTextureAssets.forEach((asset) => {
        const family = decorativeAssetFamily(asset);
        if (!groups.has(family)) groups.set(family, []);
        groups.get(family).push(asset);
      });

      groups.forEach((assets, family) => {
        assets.sort((assetA, assetB) => {
          const scoreA = hashString(`${page}:${family}:${assetA}:${seed}`);
          const scoreB = hashString(`${page}:${family}:${assetB}:${seed}`);
          return scoreA - scoreB;
        });
      });

      for (let i = 0; i < count; i += 1) {
        const recentFamilies = selected
          .slice(Math.max(0, selected.length - spacingRadius))
          .map((asset) => decorativeAssetFamily(asset));
        const candidates = Array.from(groups.entries())
          .filter(([, assets]) => assets.length)
          .sort((entryA, entryB) => {
            const [familyA, assetsA] = entryA;
            const [familyB, assetsB] = entryB;
            const recentA = recentFamilies.includes(familyA) ? 1 : 0;
            const recentB = recentFamilies.includes(familyB) ? 1 : 0;
            if (recentA !== recentB) return recentA - recentB;
            if (assetsA.length !== assetsB.length) return assetsB.length - assetsA.length;
            return hashString(`${page}:${i}:${familyA}:${seed}`) - hashString(`${page}:${i}:${familyB}:${seed}`);
          });

        const chosen = candidates[0];
        if (chosen) {
          const [, assets] = chosen;
          const asset = assets.shift();
          if (asset) {
            selected.push(asset);
          }
        }
      }

      return selected;
    }

    function sampleTextureColour(texture, fallbackColour) {
      const image = texture.image;
      if (!image || !image.width || !image.height) return fallbackColour.clone();

      try {
        const sampler = doc.createElement('canvas');
        const size = 18;
        sampler.width = size;
        sampler.height = size;
        const context = sampler.getContext('2d', { willReadFrequently: true });
        if (!context) return fallbackColour.clone();

        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let red = 0;
        let green = 0;
        let blue = 0;
        let samples = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3];
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;

          if (alpha < 30 || luminance > 247) continue;
          red += r;
          green += g;
          blue += b;
          samples += 1;
        }

        if (!samples) return fallbackColour.clone();

        return new THREE.Color(red / samples / 255, green / samples / 255, blue / samples / 255)
          .lerp(fallbackColour, 0.22);
      } catch (_) {
        return fallbackColour.clone();
      }
    }

    const liquidVertexShader = `
      uniform float uTime;
      uniform float uPointer;
      uniform float uMorph;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 p = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `;

    const liquidFragmentShader = `
      uniform sampler2D uMap;
      uniform vec3 uTint;
      uniform float uTime;
      uniform float uPointer;
      uniform float uMorph;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec4 currentTex = texture2D(uMap, vUv);
        vec4 mixedTex = currentTex;
        vec2 edgeUv = min(vUv, 1.0 - vUv);
        float edge = 1.0 - smoothstep(0.0, 0.11, min(edgeUv.x, edgeUv.y));
        float sheen = smoothstep(0.78, 1.0, sin((vUv.x * 5.2) + (vUv.y * 6.4) + uTime * 0.82 + uMorph * 2.0) * 0.5 + 0.5);
        vec3 colour = mix(mixedTex.rgb, mixedTex.rgb * uTint, 0.08);
        colour += vec3(1.0, 0.82, 0.46) * sheen * uPointer * mixedTex.a * 0.035;
        colour += uTint * edge * mixedTex.a * (0.04 + uPointer * 0.025);
        float alpha = max(currentTex.a, mixedTex.a) * uOpacity;

        if (alpha < 0.035) discard;
        gl_FragColor = vec4(colour, alpha);
      }
    `;

    function createLiquidFaceMaterial(texture, tintColour, opacity) {
      return new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uTint: { value: tintColour },
          uTime: { value: 0 },
          uPointer: { value: 0 },
          uMorph: { value: 0 },
          uOpacity: { value: opacity }
        },
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
    }

    function addDecorativeObjects() {
      const selectedAssets = selectDecorativeAssets();
      const accentMaterialColour = new THREE.Color(theme.accent);
      liquidLinkPositions = new Float32Array(selectedAssets.length * 2 * 3);
      liquidLinkGeometry = new THREE.BufferGeometry();
      liquidLinkGeometry.setAttribute('position', new THREE.BufferAttribute(liquidLinkPositions, 3).setUsage(THREE.DynamicDrawUsage));
      liquidLinkMaterial = new THREE.LineBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      liquidLinks = new THREE.LineSegments(liquidLinkGeometry, liquidLinkMaterial);
      liquidLinks.frustumCulled = false;
      decor.add(liquidLinks);

      selectedAssets.forEach((asset, index) => {
        textureLoader.load(asset, (texture) => {
          if (THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }

          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), compactMode ? 4 : 8);

          const sourceSlot = buildScatterSlot(index);
          const slot = compactMode
            ? (() => {
                const lane = index % 6;
                const side = index % 2 ? 1 : -1;
                const laneY = [3.04, 2.34, 1.54, -1.48, -2.32, -3.04][lane];
                const sideLane = side * (0.72 + (index % 3) * 0.18);
                const visibilityLift = page === 'odyssey' ? 0.16 : 0;

                return [
                  clamp(sourceSlot[0] * 0.24 + sideLane, -2.24, 2.24),
                  clamp(sourceSlot[1] * 0.22 + laneY, -3.34, 3.34),
                  sourceSlot[2] + (page === 'odyssey' ? 0.02 : 0.38),
                  sourceSlot[3] * (page === 'odyssey' ? 1.42 : 1.08),
                  sourceSlot[4] * 0.72,
                  sourceSlot[5] * 0.62,
                  sourceSlot[6] + visibilityLift * side
                ];
              })()
            : sourceSlot;
          const sphereSlot = buildSphereSlot(index, selectedAssets.length);
          const imageWidth = texture.image && texture.image.width ? texture.image.width : 384;
          const imageHeight = texture.image && texture.image.height ? texture.image.height : 384;
          const aspect = clamp(imageWidth / Math.max(imageHeight, 1), 0.12, 8);
          const isPrimaryObject = !compactMode && (page === 'home' ? index < 18 : page === 'odyssey' ? true : index < 22);
          const baseScaleBoost = page === 'odyssey'
            ? (compactMode ? 1.48 : 1.5)
            : (compactMode ? 0.92 : isPrimaryObject ? 1.16 : 0.96);
          const baseScale = slot[3] * baseScaleBoost;
          const objectWidth = aspect >= 1 ? baseScale : baseScale * aspect;
          const objectHeight = aspect >= 1 ? baseScale / aspect : baseScale;
          const geometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 8, 8);
          const objectDepth = page === 'odyssey'
            ? (compactMode ? 0.052 : 0.086)
            : (compactMode ? 0.026 : 0.046);
          const depthGeometry = new THREE.BoxGeometry(
            objectWidth * 0.94,
            objectHeight * 0.94,
            objectDepth,
            1,
            1,
            1
          );
          const edgeGeometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 1, 1);
          const objectEdges = new THREE.EdgesGeometry(edgeGeometry);
          const shadowGeometry = new THREE.PlaneGeometry(objectWidth * 1.18, objectHeight * 1.18, 1, 1);
          const group = new THREE.Group();
          const sampledColour = sampleTextureColour(texture, accentMaterialColour);
          const glassColour = new THREE.Color(0xffffff).lerp(sampledColour, 0.16).lerp(accentMaterialColour, 0.1);
          const depthColour = sampledColour.clone().lerp(accentMaterialColour, 0.6);
          const edgeColour = sampledColour.clone().lerp(accentMaterialColour, 0.42);
          const shadowColour = new THREE.Color(0x6f5527).lerp(sampledColour, 0.24);
          const backBaseOpacity = page === 'odyssey'
            ? (compactMode ? 0.07 : isPrimaryObject ? 0.052 : 0.038)
            : (compactMode ? 0.016 : 0.01);
          const backMaterial = new THREE.MeshBasicMaterial({
            color: depthColour,
            transparent: true,
            opacity: backBaseOpacity,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const shadowBaseOpacity = page === 'odyssey'
            ? (compactMode ? 0.055 : 0.072)
            : (compactMode ? 0.018 : 0.012);
          const shadowMaterial = new THREE.MeshBasicMaterial({
            color: shadowColour,
            transparent: true,
            opacity: shadowBaseOpacity,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const faceBaseOpacity = compactMode ? (page === 'odyssey' ? 0.74 : 0.62) : isPrimaryObject ? 0.82 : 0.64;
          const edgeBaseOpacity = page === 'odyssey'
            ? (compactMode ? 0.28 : isPrimaryObject ? 0.34 : 0.24)
            : (compactMode ? 0.04 : isPrimaryObject ? 0.075 : 0.045);
          const faceMaterial = createLiquidFaceMaterial(texture, glassColour, faceBaseOpacity);
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: edgeColour,
            transparent: true,
            opacity: edgeBaseOpacity,
            depthWrite: false
          });
          const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
          const back = new THREE.Mesh(depthGeometry, backMaterial);
          const face = new THREE.Mesh(geometry, faceMaterial);
          const edge = new THREE.LineSegments(objectEdges, edgeMaterial);

          shadow.scale.set(1.02, 1.02, 1);
          shadow.position.set(0.034, -0.046, -objectDepth * 1.35);
          back.scale.set(1.016, 1.016, 1);
          back.position.z = -objectDepth * 0.56;
          face.position.z = objectDepth * 0.38;
          edge.position.z = objectDepth * 0.52;
          group.add(shadow);
          group.add(back);
          group.add(face);
          group.add(edge);
          group.name = `taiyzun-3d-entity-${index + 1}`;
          group.position.set(slot[0], slot[1], slot[2]);
          group.rotation.set(slot[4], slot[5], slot[6]);
          const actorRandom = seededRandom(hashString(`${page}:${asset}:${index}`));
          const actorSign = () => (actorRandom() > 0.5 ? 1 : -1);
          const actorPhase = actorRandom() * Math.PI * 2 + index * 0.377 + page.length;
          const actorEnergy = page === 'odyssey' ? 1 : 0.42;
          const leftRightBias = actorSign();
          const upDownBias = actorSign();
          const depthBias = actorSign();
          group.userData = {
            asset,
            family: decorativeAssetFamily(asset),
            baseX: slot[0],
            baseY: slot[1],
            baseZ: slot[2],
            baseRotX: slot[4],
            baseRotY: slot[5],
            baseRotZ: slot[6],
            aspect,
            sphereX: sphereSlot.x,
            sphereY: sphereSlot.y,
            sphereZ: sphereSlot.z,
            sphereCenterZ: sphereSlot.centerZ,
            sphereTheta: sphereSlot.theta,
            phase: actorPhase,
            orbitDirection: actorSign(),
            orbitSpeed: 0.135 + actorRandom() * 0.185,
            orbitScroll: 0.34 + actorRandom() * 1.04,
            swayX: (0.022 + actorRandom() * 0.126) * leftRightBias,
            swayY: (0.018 + actorRandom() * 0.096) * upDownBias,
            swayZ: (0.05 + actorRandom() * 0.22) * depthBias,
            scrollX: (0.035 + actorRandom() * 0.21) * leftRightBias,
            scrollY: (0.026 + actorRandom() * 0.18) * upDownBias,
            scrollZ: (0.08 + actorRandom() * 0.32) * depthBias * (compactMode ? 0.86 : 1),
            scrollRotX: (0.014 + actorRandom() * 0.09) * actorSign(),
            scrollRotY: (0.022 + actorRandom() * 0.115) * actorSign(),
            scrollRotZ: (0.012 + actorRandom() * 0.075) * actorSign(),
            pointerX: (0.08 + actorRandom() * 0.42) * leftRightBias,
            pointerY: (0.07 + actorRandom() * 0.34) * upDownBias,
            pointerZ: (0.08 + actorRandom() * 0.32) * depthBias,
            pointerRotX: (0.045 + actorRandom() * 0.18) * actorSign(),
            pointerRotY: (0.052 + actorRandom() * 0.22) * actorSign(),
            pointerRotZ: (0.022 + actorRandom() * 0.095) * actorSign(),
            spinX: (0.014 + actorRandom() * 0.07) * actorSign(),
            spinY: (0.018 + actorRandom() * 0.09) * actorSign(),
            spinZ: (0.012 + actorRandom() * 0.065) * actorSign(),
            flipRotX: (0.026 + actorRandom() * 0.16) * actorSign(),
            flipRotY: (0.034 + actorRandom() * 0.2) * actorSign(),
            flipSpeedX: 0.52 + actorRandom() * 1.18,
            flipSpeedY: 0.48 + actorRandom() * 1.26,
            depthPulse: 0.028 + actorRandom() * 0.12,
            depthScale: 0.14 + actorRandom() * 0.16,
            zoomPulse: 0.024 + actorRandom() * 0.084,
            zoomScroll: 0.026 + actorRandom() * 0.096,
            zoomPointer: 0.014 + actorRandom() * 0.056,
            zoomSpeed: 0.78 + actorRandom() * 1.55,
            formationDelay: compactMode ? actorRandom() * 0.16 : actorRandom() * 0.28,
            baseObjectScale: 1,
            rotationEnergy: actorEnergy,
            faceBaseOpacity,
            edgeBaseOpacity,
            backBaseOpacity,
            shadowBaseOpacity,
            faceMaterial,
            backMaterial,
            edgeMaterial,
            shadowMaterial,
            shadow
          };

          decorObjects.push(group);
          decorObjectsByIndex[index] = group;
          decor.add(group);
          root.dataset.objects = String(decorObjects.length);
          root.dataset.decor3d = String(decorObjects.length);
          root.dataset.decor3dEntities = String(decorObjects.length);
          root.dataset.decor3dMode = page === 'odyssey' ? 'sphere-orbit' : 'independent';
          root.dataset.nativeAssetScale = 'native-uniform-scale';
          root.dataset.decor3dAspectMode = 'native-uniform-scale';
          root.dataset.decor3dLayering = 'extruded-rim-shadow-depth';
          root.dataset.decor3dDepthMotion = 'z-position-plus-uniform-zoom-rim-shadow';
          root.dataset.decor3dUniqueAssets = String(new Set(decorObjects.map((object) => object.userData.asset)).size);
          root.dataset.uniqueAssets = root.dataset.decor3dUniqueAssets;
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

      const sphereBlendRaw = page === 'odyssey' ? smoothstep(0.02, 0.88, scrollRatio) : 0;
      const sphereExpansion = page === 'odyssey' ? 1 + smoothstep(0.84, 1.65, scrollRatio) * 0.34 : 1;
      const pointerEnergy = speed * clamp(Math.abs(pointer.x) * 0.72 + Math.abs(pointer.y) * 0.62 + 0.06, 0, 1);
      const liquidEnergy = page === 'odyssey'
        ? clamp(pointerEnergy + sphereBlendRaw * 0.48 + 0.12, 0, 1)
        : clamp(pointerEnergy * 0.34 + 0.018, 0, 0.34);
      let independentMotionCount = 0;
      let sphereMemberCount = 0;
      decor.rotation.set(0, 0, 0);
      root.dataset.decor3dSphereBlend = sphereBlendRaw.toFixed(3);

      decorObjects.forEach((object, index) => {
        const data = object.userData;
        const phase = data.phase + time * data.orbitSpeed * speed;
        const entityBlend = page === 'odyssey'
          ? smoothstep(data.formationDelay, 1, sphereBlendRaw)
          : 0;
        const scatterX = data.baseX
          + pointer.x * data.pointerX
          + scrollRatio * data.scrollX
          + Math.sin(phase) * data.swayX;
        const scatterY = data.baseY
          + pointer.y * data.pointerY
          + scrollRatio * data.scrollY
          + Math.cos(phase * 0.86) * data.swayY;
        const scatterZ = data.baseZ
          + pointer.x * data.pointerZ
          + scrollRatio * data.scrollZ
          + Math.sin(phase * 0.7) * data.swayZ;
        const orbitAngle = data.sphereTheta
          + time * data.orbitSpeed * data.orbitDirection * 0.62 * speed
          + scrollRatio * data.orbitScroll * data.orbitDirection;
        const relZ = data.sphereZ - data.sphereCenterZ;
        const sphereX = (data.sphereX * Math.cos(orbitAngle) - relZ * Math.sin(orbitAngle)) * sphereExpansion;
        const sphereZ = data.sphereCenterZ + (data.sphereX * Math.sin(orbitAngle) + relZ * Math.cos(orbitAngle)) * sphereExpansion;
        const sphereY = data.sphereY * sphereExpansion + Math.cos(phase * 0.8) * data.swayY * 1.8;
        const targetX = lerp(scatterX, sphereX, entityBlend);
        const targetY = lerp(scatterY, sphereY, entityBlend);
        const targetZ = lerp(scatterZ, sphereZ, entityBlend);

        if (entityBlend > 0.02) {
          sphereMemberCount += 1;
        }

        const pointerMagnitude = clamp(Math.hypot(pointer.x, pointer.y), 0, 1);
        const depthZoom = clamp((targetZ - data.baseZ) * data.depthScale, -0.28, 0.42);
        const nearFarZoom = Math.sin(phase * data.zoomSpeed + scrollRatio * data.orbitScroll + pointerMagnitude) * data.depthPulse * speed;
        const driftZoom = Math.sin(phase * data.zoomSpeed + index) * data.zoomPulse * speed;
        const scrollZoom = Math.sin(scrollRatio * data.orbitScroll + data.phase) * data.zoomScroll * speed;
        const pointerZoom = pointerMagnitude * data.zoomPointer * speed;
        const entityScale = data.baseObjectScale * clamp(
          1 + driftZoom + scrollZoom + pointerZoom + nearFarZoom + depthZoom + entityBlend * 0.2,
          page === 'odyssey' ? 0.58 : 0.72,
          page === 'odyssey' ? (compactMode ? 2.08 : 1.86) : 1.42
        );
        const rotationEnergy = data.rotationEnergy;
        const flipX = Math.sin(phase * data.flipSpeedX + scrollRatio * 0.72) * data.flipRotX * speed * rotationEnergy;
        const flipY = Math.cos(phase * data.flipSpeedY - scrollRatio * 0.64) * data.flipRotY * speed * rotationEnergy;

        if (
          Math.abs(scatterX - data.baseX) > 0.006 ||
          Math.abs(scatterY - data.baseY) > 0.006 ||
          Math.abs(entityScale - data.baseObjectScale) > 0.004
        ) {
          independentMotionCount += 1;
        }

        object.position.x = targetX;
        object.position.y = targetY;
        object.position.z = targetZ;
        object.scale.setScalar(entityScale);
        object.rotation.x = data.baseRotX
          + pointer.y * data.pointerRotX * rotationEnergy
          + scrollRatio * data.scrollRotX * rotationEnergy
          + Math.cos(phase * 0.74) * data.spinX * speed * rotationEnergy
          + flipX
          + entityBlend * Math.sin(orbitAngle) * 0.24;
        object.rotation.y = data.baseRotY
          + pointer.x * data.pointerRotY * rotationEnergy
          + scrollRatio * data.scrollRotY * rotationEnergy
          + Math.sin(phase * 0.67) * data.spinY * speed * rotationEnergy
          + flipY
          + entityBlend * Math.cos(orbitAngle) * 0.34;
        object.rotation.z = data.baseRotZ
          + pointer.x * data.pointerRotZ * rotationEnergy
          + scrollRatio * data.scrollRotZ * rotationEnergy
          + Math.sin(phase * 0.9) * data.spinZ * speed * rotationEnergy
          + entityBlend * data.orbitDirection * 0.22;

        const depthGlow = clamp(0.5 + depthZoom * 1.9 + nearFarZoom * 2.4 + entityBlend * 0.22, 0.28, 1.45);
        data.backMaterial.opacity = data.backBaseOpacity * depthGlow + entityBlend * 0.018;
        data.edgeMaterial.opacity = data.edgeBaseOpacity * (0.88 + liquidEnergy * 0.42) + entityBlend * 0.07;
        data.shadowMaterial.opacity = data.shadowBaseOpacity * clamp(1.12 - depthZoom * 1.65 + entityBlend * 0.16, 0.34, 1.36);
        data.shadow.scale.setScalar(clamp(1.02 + pointerMagnitude * 0.05 - depthZoom * 0.06, 0.96, 1.12));
        data.faceMaterial.uniforms.uOpacity.value = data.faceBaseOpacity + entityBlend * (compactMode ? 0.04 : 0.08);
        data.faceMaterial.uniforms.uTime.value = time + index * 0.021;
        data.faceMaterial.uniforms.uPointer.value = liquidEnergy;
        data.faceMaterial.uniforms.uMorph.value = (Math.sin(phase * 0.56 + pointer.x * data.orbitDirection * 1.6) + 1) * 0.5;
      });

      if (liquidLinkPositions && liquidLinkGeometry && decorObjectsByIndex.length > 1) {
        let cursor = 0;
        for (let i = 0; i < decorObjectsByIndex.length; i += 1) {
          const current = decorObjectsByIndex[i];
          const next = decorObjectsByIndex[(i + 1) % decorObjectsByIndex.length];
          if (!current || !next) {
            liquidLinkPositions[cursor] = 0;
            liquidLinkPositions[cursor + 1] = 0;
            liquidLinkPositions[cursor + 2] = 0;
            liquidLinkPositions[cursor + 3] = 0;
            liquidLinkPositions[cursor + 4] = 0;
            liquidLinkPositions[cursor + 5] = 0;
            cursor += 6;
            continue;
          }

          const bias = 0.5 + Math.sin(time * 0.55 + i) * 0.08 * liquidEnergy;
          liquidLinkPositions[cursor] = current.position.x;
          liquidLinkPositions[cursor + 1] = current.position.y;
          liquidLinkPositions[cursor + 2] = current.position.z - 0.018;
          liquidLinkPositions[cursor + 3] = lerp(current.position.x, next.position.x, bias);
          liquidLinkPositions[cursor + 4] = lerp(current.position.y, next.position.y, bias);
          liquidLinkPositions[cursor + 5] = lerp(current.position.z, next.position.z, bias) - 0.018;
          cursor += 6;
        }

        liquidLinkGeometry.attributes.position.needsUpdate = true;
        liquidLinkMaterial.opacity = (compactMode ? 0.018 : 0.028) + liquidEnergy * (compactMode ? 0.022 : 0.034) + sphereBlendRaw * 0.025;
      }

      if (frame % 10 === 0 || frame <= 3) {
        const orderedObjects = decorObjectsByIndex.filter(Boolean);
        const families = orderedObjects.map((object) => object.userData.family);
        const spacingRadius = compactMode ? 3 : 4;
        let similarNeighbourCount = 0;

        families.forEach((family, index) => {
          for (let offset = 1; offset <= spacingRadius && index - offset >= 0; offset += 1) {
            if (families[index - offset] === family) similarNeighbourCount += 1;
          }
        });

        root.dataset.decor3dIndependent = String(independentMotionCount);
        root.dataset.decor3dSphereMembers = String(sphereMemberCount);
        root.dataset.decor3dColours = 'sampled';
        root.dataset.decor3dLiquid = liquidEnergy.toFixed(3);
        root.dataset.decor3dLayering = 'extruded-rim-shadow-depth';
        root.dataset.decor3dAspectMode = 'native-uniform-scale';
        root.dataset.decor3dDepthMotion = 'z-position-plus-uniform-zoom-rim-shadow';
        root.dataset.decor3dScaleMode = page === 'odyssey' ? 'large-depth-responsive' : 'native-depth-responsive';
        root.dataset.decor3dFamilySpacing = `slot-family-radius-${spacingRadius}`;
        root.dataset.decor3dSimilarNeighbours = String(similarNeighbourCount);
        root.dataset.similarNeighbours = String(similarNeighbourCount);
        root.dataset.objects = String(orderedObjects.length);
        root.dataset.nativeAssetScale = 'native-uniform-scale';
        root.dataset.uniqueAssets = String(new Set(orderedObjects.map((object) => object.userData.asset)).size);
        root.dataset.decor3dUniqueAssets = root.dataset.uniqueAssets;
        root.dataset.decor3dUniqueMotion = 'seeded-per-png';
      }

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
    const priorityPage = page === 'odyssey';
    const delay = priorityPage ? (compactMode ? 300 : 420) : (compactMode ? 900 : 1400);
    const idleTimeout = priorityPage ? 1000 : 2600;
    let timer = 0;
    let scheduledDelay = Infinity;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(startThreeField, { timeout: idleTimeout });
      } else {
        startThreeField();
      }
    };

    const schedule = (nextDelay = delay) => {
      if (started || nextDelay >= scheduledDelay) return;
      if (timer) window.clearTimeout(timer);
      scheduledDelay = nextDelay;
      timer = window.setTimeout(start, nextDelay);
    };

    const interactionStart = () => {
      schedule(priorityPage ? 180 : 320);
    };

    if (doc.readyState === 'complete' || (priorityPage && doc.readyState !== 'loading')) {
      schedule();
    } else {
      const eventName = priorityPage ? 'DOMContentLoaded' : 'load';
      window.addEventListener(eventName, () => schedule(), { once: true });
    }

    if (!priorityPage) {
      window.addEventListener('pointerdown', interactionStart, { once: true, passive: true });
      window.addEventListener('wheel', interactionStart, { once: true, passive: true });
      window.addEventListener('keydown', interactionStart, { once: true });
    }
  }

  scheduleThreeField();
}
