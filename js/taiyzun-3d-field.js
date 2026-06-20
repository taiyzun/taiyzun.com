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

  function attachSurfaceDepth() {
    const selector = [
      '.hero-content', '.page-hero-content', '.about-grid', '.highlight-card', '.thesis-card',
      '.value-item', '.timeline-category', '.timeline-item', '.gallery-label', '.connect-label',
      '.contact-form', '.social-card', '.info-card', '.cat-tab', '.art-item', '.gallery-item', '.home-btn'
    ].join(',');

    doc.querySelectorAll(selector).forEach((node, index) => {
      if (node.dataset.tz3dSurface === 'true') return;
      node.dataset.tz3dSurface = 'true';
      node.classList.add('tz3d-surface');
      node.style.setProperty('--tz3d-seed', String(index % 11));

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
  }

  attachSurfaceDepth();
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
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const quality = compactMode ? 0.58 : 1;
    let frame = 0;
    let running = true;
    let width = 1;
    let height = 1;

    scene.add(field);
    field.add(macro);
    field.add(micro);
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
