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

  function resize() {
    if (!renderer || !camera) return;

    const rect = root.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
    height = Math.max(1, Math.round(rect.height || window.innerHeight || 1));

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactMode ? 1.35 : 1.75));

    camera.aspect = width / height;
    camera.position.z = width < 760 ? 7.55 : 6.75;
    camera.updateProjectionMatrix();

    if (swordGroup) {
      swordGroup.position.x = width < 760 ? 0 : 1.28;
      swordGroup.position.y = width < 760 ? 0.9 : -0.08;
      swordGroup.scale.setScalar(width < 760 ? 0.86 : 1);
    }
  }

  function animate(now = 0) {
    frameId = window.requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !swordGroup || !visible) return;

    const t = now * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.055;
    pointer.y += (pointer.ty - pointer.y) * 0.055;

    const spin = reduceMotion ? 0.14 : t * 0.22;
    swordGroup.rotation.y = spin + pointer.x * 0.16;
    swordGroup.rotation.x = Math.sin(t * 0.48) * 0.035 - pointer.y * 0.06;
    swordGroup.rotation.z = Math.sin(t * 0.22) * 0.018;
    swordGroup.position.z = Math.sin(t * 0.72) * 0.05;

    root.dataset.rotationY = swordGroup.rotation.y.toFixed(3);
    renderer.render(scene, camera);
  }

  async function init() {
    try {
      const THREE = await import('./vendor/three.module.min.js');

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !compactMode,
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

      const faceGeometry = new THREE.PlaneGeometry(objectWidth, objectHeight, 1, 1);
      const faceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.035,
        metalness: 0.24,
        roughness: 0.42,
        side: THREE.DoubleSide
      });

      const face = new THREE.Mesh(faceGeometry, faceMaterial);
      face.position.z = 0.08;
      swordGroup.add(face);

      const depthGeometry = new THREE.BoxGeometry(objectWidth * 0.92, objectHeight * 0.94, 0.16);
      const depthMaterial = new THREE.MeshStandardMaterial({
        color: 0xb88a16,
        metalness: 0.68,
        roughness: 0.32,
        transparent: true,
        opacity: 0.12,
        depthWrite: false
      });
      const depth = new THREE.Mesh(depthGeometry, depthMaterial);
      depth.position.z = -0.04;
      swordGroup.add(depth);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(depthGeometry),
        new THREE.LineBasicMaterial({
          color: 0xf0cf74,
          transparent: true,
          opacity: 0.24
        })
      );
      edge.position.z = -0.04;
      swordGroup.add(edge);

      scene.add(swordGroup);
      resize();
      setStatus('ready');
      root.dataset.texture = textureSrc;
      root.dataset.object = 'taiyzun-sword-logo-2021';
      root.dataset.lighting = 'ambient-directional-rim';
      root.dataset.motion = reduceMotion ? 'reduced-y-axis' : 'smooth-y-axis-rotation';

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
