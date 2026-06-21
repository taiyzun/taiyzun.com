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
      if (index < decorSlots.length) return source;

      const angle = index * goldenAngle + page.length * 0.23;
      const radiusX = compactMode ? 2.22 : 5.86;
      const radiusY = compactMode ? 3.18 : 3.08;
      const edgePull = 0.82 + (index % 4) * 0.06;

      return [
        Math.cos(angle) * radiusX * edgePull,
        Math.sin(angle * 1.17) * radiusY,
        -3.02 - (index % 6) * 0.34,
        0.4 + (index % 5) * 0.054,
        Math.sin(angle) * 0.28,
        Math.cos(angle * 0.9) * 0.62,
        Math.sin(angle * 1.33) * 0.34
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

      for (let i = 0; i < count; i += 1) {
        const index = page === 'odyssey'
          ? i % decorativeTextureAssets.length
          : (seed + i * 5 + Math.floor(i / 3) * 2) % decorativeTextureAssets.length;
        selected.push(decorativeTextureAssets[index]);
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
        vec2 centre = uv - 0.5;
        float curvature = dot(centre, centre);
        float waveA = sin((uv.y * 11.0) + (uTime * 1.15) + (uMorph * 4.0));
        float waveB = cos((uv.x * 9.0) - (uTime * 0.82));
        p.x += waveA * 0.026 * uPointer;
        p.y += waveB * 0.018 * uPointer;
        p.z += curvature * 0.052 + (waveA + waveB) * 0.024 * uPointer;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `;

    const liquidFragmentShader = `
      uniform sampler2D uMap;
      uniform sampler2D uNextMap;
      uniform vec3 uTint;
      uniform float uTime;
      uniform float uPointer;
      uniform float uMorph;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 wave = vec2(
          sin((vUv.y + uTime * 0.045) * 22.0),
          cos((vUv.x - uTime * 0.04) * 19.0)
        ) * 0.012 * uPointer;
        vec4 currentTex = texture2D(uMap, vUv + wave);
        vec4 nextTex = texture2D(uNextMap, vUv - wave * 0.76);
        float veil = smoothstep(0.08, 0.92, uMorph + sin((vUv.x + vUv.y + uTime * 0.32) * 5.0) * 0.08 * uPointer);
        vec4 mixedTex = mix(currentTex, nextTex, veil * 0.34 * uPointer);
        vec2 edgeUv = min(vUv, 1.0 - vUv);
        float edge = 1.0 - smoothstep(0.0, 0.11, min(edgeUv.x, edgeUv.y));
        float sheen = smoothstep(0.78, 1.0, sin((vUv.x * 5.2) + (vUv.y * 6.4) + uTime * 0.82 + uMorph * 2.0) * 0.5 + 0.5);
        vec3 colour = mix(mixedTex.rgb, mixedTex.rgb * uTint, 0.18);
        colour += vec3(1.0, 0.82, 0.46) * sheen * uPointer * mixedTex.a * 0.13;
        colour += uTint * edge * mixedTex.a * (0.08 + uPointer * 0.08);
        float alpha = max(currentTex.a, mixedTex.a) * uOpacity;

        if (alpha < 0.035) discard;
        gl_FragColor = vec4(colour, alpha);
      }
    `;

    function createLiquidFaceMaterial(texture, nextTexture, tintColour, opacity) {
      return new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uNextMap: { value: nextTexture || texture },
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
      const loadedDecorTextures = [];
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

      function updateNeighbourTextures(index) {
        const total = selectedAssets.length;
        const currentGroup = decorObjectsByIndex[index];
        const nextTexture = loadedDecorTextures[(index + 1) % total];
        const previousIndex = (index - 1 + total) % total;
        const previousGroup = decorObjectsByIndex[previousIndex];

        if (currentGroup && nextTexture) {
          currentGroup.userData.faceMaterial.uniforms.uNextMap.value = nextTexture;
        }

        if (previousGroup && loadedDecorTextures[index]) {
          previousGroup.userData.faceMaterial.uniforms.uNextMap.value = loadedDecorTextures[index];
        }
      }

      selectedAssets.forEach((asset, index) => {
        textureLoader.load(asset, (texture) => {
          if (THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }

          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), compactMode ? 4 : 8);
          loadedDecorTextures[index] = texture;

          const sourceSlot = buildScatterSlot(index);
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
          const sphereSlot = buildSphereSlot(index, selectedAssets.length);
          const imageWidth = texture.image && texture.image.width ? texture.image.width : 384;
          const imageHeight = texture.image && texture.image.height ? texture.image.height : 384;
          const aspect = clamp(imageWidth / Math.max(imageHeight, 1), 0.34, 2.7);
          const baseScale = slot[3] * (compactMode ? 0.9 : 1);
          const objectWidth = baseScale * Math.sqrt(aspect);
          const objectHeight = baseScale / Math.sqrt(aspect);
          const geometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 8, 8);
          const depthGeometry = new THREE.BoxGeometry(
            objectWidth * 0.92,
            objectHeight * 0.92,
            compactMode ? 0.018 : 0.032,
            1,
            1,
            1
          );
          const edgeGeometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 1, 1);
          const objectEdges = new THREE.EdgesGeometry(edgeGeometry);
          const group = new THREE.Group();
          const sampledColour = sampleTextureColour(texture, accentMaterialColour);
          const glassColour = new THREE.Color(0xffffff).lerp(sampledColour, 0.16).lerp(accentMaterialColour, 0.1);
          const depthColour = sampledColour.clone().lerp(accentMaterialColour, 0.6);
          const edgeColour = sampledColour.clone().lerp(accentMaterialColour, 0.42);
          const backMaterial = new THREE.MeshBasicMaterial({
            color: depthColour,
            transparent: true,
            opacity: compactMode ? 0.055 : 0.07,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const faceMaterial = createLiquidFaceMaterial(texture, loadedDecorTextures[(index + 1) % selectedAssets.length] || texture, glassColour, compactMode ? 0.46 : 0.4);
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: edgeColour,
            transparent: true,
            opacity: compactMode ? 0.22 : 0.28,
            depthWrite: false
          });
          const back = new THREE.Mesh(depthGeometry, backMaterial);
          const face = new THREE.Mesh(geometry, faceMaterial);
          const edge = new THREE.LineSegments(objectEdges, edgeMaterial);

          back.scale.set(1.01, 1.01, 1);
          back.position.z = -0.036;
          face.position.z = 0.025;
          edge.position.z = 0.036;
          group.add(back);
          group.add(face);
          group.add(edge);
          group.name = `taiyzun-3d-entity-${index + 1}`;
          group.position.set(slot[0], slot[1], slot[2]);
          group.rotation.set(slot[4], slot[5], slot[6]);
          group.userData = {
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
            phase: index * 0.74 + page.length,
            orbitDirection: index % 2 ? 1 : -1,
            orbitSpeed: 0.16 + (index % 7) * 0.021,
            orbitScroll: 0.58 + (index % 6) * 0.12,
            swayX: 0.035 + (index % 5) * 0.019,
            swayY: 0.026 + (index % 4) * 0.014,
            swayZ: 0.05 + (index % 6) * 0.018,
            scrollX: (index % 2 ? 1 : -1) * (0.08 + (index % 5) * 0.018),
            scrollY: (index % 3 - 1) * (0.09 + (index % 4) * 0.014),
            scrollZ: -0.04 - (index % 5) * 0.016,
            pointerX: (0.18 + (index % 5) * 0.052) * (index % 2 ? 1 : -1),
            pointerY: 0.12 + (index % 6) * 0.035,
            pointerZ: (index % 2 ? -1 : 1) * (0.08 + (index % 4) * 0.024),
            pointerRotX: 0.07 + (index % 5) * 0.018,
            pointerRotY: 0.11 + (index % 6) * 0.021,
            spinX: 0.026 + (index % 6) * 0.008,
            spinY: 0.034 + (index % 7) * 0.009,
            spinZ: 0.022 + (index % 5) * 0.007,
            scalePulse: 0.018 + (index % 6) * 0.004,
            formationDelay: compactMode ? (index % 4) * 0.035 : (index % 7) * 0.028,
            baseObjectScale: 1,
            faceMaterial,
            backMaterial,
            edgeMaterial
          };

          decorObjects.push(group);
          decorObjectsByIndex[index] = group;
          decor.add(group);
          updateNeighbourTextures(index);
          updateNeighbourTextures((index - 1 + selectedAssets.length) % selectedAssets.length);
          root.dataset.decor3d = String(decorObjects.length);
          root.dataset.decor3dEntities = String(decorObjects.length);
          root.dataset.decor3dMode = page === 'odyssey' ? 'sphere-orbit' : 'independent';
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
      const liquidEnergy = clamp(pointerEnergy + sphereBlendRaw * 0.48 + (page === 'odyssey' ? 0.12 : 0.04), 0, 1);
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
        const pulse = Math.sin(phase * 1.92 + index) * data.scalePulse * speed;
        const entityScale = data.baseObjectScale * (1 + pulse + entityBlend * 0.16);

        if (
          Math.abs(scatterX - data.baseX) > 0.006 ||
          Math.abs(scatterY - data.baseY) > 0.006 ||
          Math.abs(entityScale - data.baseObjectScale) > 0.004
        ) {
          independentMotionCount += 1;
        }

        if (entityBlend > 0.02) {
          sphereMemberCount += 1;
        }

        object.position.x = lerp(scatterX, sphereX, entityBlend);
        object.position.y = lerp(scatterY, sphereY, entityBlend);
        object.position.z = lerp(scatterZ, sphereZ, entityBlend);
        object.scale.setScalar(entityScale);
        object.rotation.x = data.baseRotX
          + pointer.y * data.pointerRotX
          + Math.cos(phase * 0.74) * data.spinX * speed
          + entityBlend * Math.sin(orbitAngle) * 0.24;
        object.rotation.y = data.baseRotY
          + pointer.x * data.pointerRotY
          + Math.sin(phase * 0.67) * data.spinY * speed
          + entityBlend * Math.cos(orbitAngle) * 0.34;
        object.rotation.z = data.baseRotZ
          + Math.sin(phase * 0.9) * data.spinZ * speed
          + entityBlend * data.orbitDirection * 0.22;

        data.backMaterial.opacity = (compactMode ? 0.052 : 0.066) + entityBlend * 0.024;
        data.edgeMaterial.opacity = (compactMode ? 0.16 : 0.22) + entityBlend * 0.08;
        data.faceMaterial.uniforms.uOpacity.value = (compactMode ? 0.44 : 0.38) + entityBlend * (compactMode ? 0.08 : 0.1);
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

      if (frame % 10 === 0) {
        root.dataset.decor3dIndependent = String(independentMotionCount);
        root.dataset.decor3dSphereMembers = String(sphereMemberCount);
        root.dataset.decor3dColours = 'sampled';
        root.dataset.decor3dLiquid = liquidEnergy.toFixed(3);
        root.dataset.decor3dLayering = 'single-surface-depth';
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
    const delay = priorityPage ? (compactMode ? 900 : 1300) : (compactMode ? 2400 : 5600);
    const idleTimeout = priorityPage ? 2400 : 6200;
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

    if (doc.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', () => schedule(), { once: true });
    }

    if (!priorityPage) {
      window.addEventListener('pointerdown', interactionStart, { once: true, passive: true });
      window.addEventListener('wheel', interactionStart, { once: true, passive: true });
      window.addEventListener('keydown', interactionStart, { once: true });
    }
  }

  scheduleThreeField();
}
