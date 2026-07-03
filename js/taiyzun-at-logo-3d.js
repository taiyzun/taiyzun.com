(() => {
  const roots = Array.from(document.querySelectorAll('[data-at-logo-3d]'));
  if (!roots.length || window.__TAIYZUN_AT_LOGO_3D__) return;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const compactMode = Boolean(
    window.TAIYZUN_MOBILE_LITE ||
    window.matchMedia?.('(max-width: 820px), (pointer: coarse)')?.matches ||
    navigator.connection?.saveData
  );

  window.__TAIYZUN_AT_LOGO_3D__ = {
    roots: roots.length,
    compactMode,
    reduceMotion,
    ready: false
  };

  if (compactMode || reduceMotion) {
    roots.forEach((root) => {
      root.dataset.status = reduceMotion ? 'static-reduced-motion' : 'static-mobile';
    });
    return;
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const scroll = { y: 0, ty: 0 };
  let active = true;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateMotionTargets() {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    scroll.ty = clamp(window.scrollY / maxScroll, 0, 1);
  }

  window.addEventListener('pointermove', (event) => {
    pointer.tx = clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
    pointer.ty = clamp((event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    pointer.tx = 0;
    pointer.ty = 0;
  }, { passive: true });

  window.addEventListener('scroll', updateMotionTargets, { passive: true });
  window.addEventListener('visibilitychange', () => {
    active = !document.hidden;
  });
  updateMotionTargets();

  function tuneMaterials(THREE, object) {
    object.traverse((child) => {
      if (!child.isMesh) return;
      child.frustumCulled = false;

      if (child.geometry?.computeVertexNormals) {
        child.geometry.computeVertexNormals();
      }

      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => tuneMaterial(THREE, material));
      } else {
        child.material = tuneMaterial(THREE, child.material);
      }
    });
  }

  function tuneMaterial(THREE, material) {
    const next = material?.clone ? material.clone() : new THREE.MeshStandardMaterial();
    if (!next.map && !next.color) next.color = new THREE.Color(0xd8b35e);
    if (typeof next.metalness === 'number') next.metalness = Math.max(next.metalness, 0.82);
    if (typeof next.roughness === 'number') next.roughness = Math.min(next.roughness, 0.26);
    next.envMapIntensity = Math.max(next.envMapIntensity || 0, 0.95);
    next.side = THREE.DoubleSide;
    return next;
  }

  function normalizeModel(THREE, object, targetHeight) {
    object.updateMatrixWorld(true);
    const firstBox = new THREE.Box3().setFromObject(object);
    const firstSize = new THREE.Vector3();
    firstBox.getSize(firstSize);

    if (firstSize.z > firstSize.y * 1.3 && firstSize.z > firstSize.x * 1.3) {
      object.rotation.x = -Math.PI / 2;
    } else if (firstSize.x > firstSize.y * 1.3 && firstSize.x > firstSize.z * 1.3) {
      object.rotation.z = Math.PI / 2;
    }

    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    object.position.x -= center.x;
    object.position.y -= center.y;
    object.position.z -= center.z;

    const largestSide = Math.max(size.x, size.y, 0.001);
    const scale = targetHeight / largestSide;
    object.scale.multiplyScalar(scale);

    return {
      width: size.x * scale,
      height: size.y * scale,
      depth: size.z * scale,
      scale
    };
  }

  function variantConfig(variant) {
    const base = {
      x: -2.14,
      y: 0.52,
      z: 0,
      height: 1.34,
      yaw: -0.18,
      opacity: 1,
      orbit: 0.09
    };

    if (variant === 'home') {
      return { ...base, x: 2.5, y: 0.58, height: 1.12, yaw: -0.12, orbit: 0.08 };
    }

    if (variant === 'odyssey') {
      return { ...base, x: -2.18, y: 0.48, height: 1.42, yaw: -0.24, orbit: 0.1 };
    }

    if (variant === 'creations') {
      return { ...base, x: -2.12, y: 0.48, height: 1.48, yaw: -0.2, orbit: 0.1 };
    }

    if (variant === 'connect') {
      return { ...base, x: -2.08, y: 0.42, height: 1.3, yaw: -0.14, orbit: 0.09 };
    }

    return base;
  }

  async function initRoot(root, rootIndex) {
    const canvas = root.querySelector('[data-at-logo-3d-canvas]');
    const fallback = root.querySelector('[data-at-logo-3d-fallback]');
    if (!canvas) return null;

    root.dataset.status = 'loading';

    const THREE = await import('/js/vendor/three.module.min.js');
    const { GLTFLoader } = await import('/js/vendor/GLTFLoader.js?v=20260703a');
    const config = variantConfig(root.dataset.atLogoVariant || '');
    const modelSrc = root.dataset.atLogoModel || '/assets/models/taiyzun-at-logo-blade-edge-gold-silver-web.glb';

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 36);

    scene.add(new THREE.AmbientLight(0xfff0c7, 1.18));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
    keyLight.position.set(3.5, 3.2, 4.8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd9b76b, 1.35);
    rimLight.position.set(-3.6, 1.6, -3.8);
    scene.add(rimLight);

    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(modelSrc, resolve, undefined, reject);
    });

    const model = gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error('Taiyzun @ logo GLB scene missing');

    tuneMaterials(THREE, model);
    const bounds = normalizeModel(THREE, model, config.height);

    const group = new THREE.Group();
    group.name = 'TaiyzunAtLogo3D';
    group.add(model);
    scene.add(group);

    let width = 1;
    let height = 1;
    let frameId = 0;
    let startTime = 0;
    let lastDatasetUpdate = 0;

    function resize() {
      const rect = root.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
      height = Math.max(1, Math.round(rect.height || window.innerHeight || 1));
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      camera.aspect = width / height;
      camera.position.z = width < 900 ? 6.2 : 5.75;
      camera.updateProjectionMatrix();
    }

    function animate(now = 0) {
      frameId = window.requestAnimationFrame(animate);
      if (!active) return;

      if (!startTime) startTime = now;
      const t = (now - startTime) * 0.001;
      pointer.x += (pointer.tx - pointer.x) * 0.052;
      pointer.y += (pointer.ty - pointer.y) * 0.052;
      scroll.y += (scroll.ty - scroll.y) * 0.05;

      const phase = t * 0.28 + rootIndex * 0.62;
      const spin = t * 0.24;
      const orbit = config.orbit;
      const pulse = 1 + Math.sin(t * 0.44 + rootIndex) * 0.018;

      group.position.x = config.x + Math.sin(phase) * orbit + pointer.x * 0.1;
      group.position.y = config.y + Math.cos(phase * 0.8) * orbit * 0.48 - scroll.y * 0.22 - pointer.y * 0.06;
      group.position.z = config.z + Math.sin(phase * 1.18) * orbit * 0.58 + scroll.y * 0.12;
      group.rotation.x = Math.sin(t * 0.22 + rootIndex) * 0.09 - pointer.y * 0.1 + scroll.y * 0.12;
      group.rotation.y = config.yaw + spin + pointer.x * 0.24 + scroll.y * 0.9;
      group.rotation.z = Math.sin(t * 0.18 + rootIndex) * 0.045 + pointer.x * 0.035;
      group.scale.setScalar(pulse);

      keyLight.position.x = 3.5 + pointer.x * 0.7 + Math.sin(phase) * 0.2;
      rimLight.intensity = 1.25 + Math.abs(pointer.x) * 0.22 + scroll.y * 0.16;

      if (now - lastDatasetUpdate > 240) {
        lastDatasetUpdate = now;
        root.dataset.rotationY = group.rotation.y.toFixed(3);
        root.dataset.revolution = `${group.position.x.toFixed(2)},${group.position.y.toFixed(2)},${group.position.z.toFixed(2)}`;
        root.dataset.scrollMotion = scroll.y.toFixed(3);
      }

      renderer.render(scene, camera);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    root.dataset.status = 'ready';
    root.dataset.model = modelSrc;
    root.dataset.geometry = 'blade-edge-gold-silver-glb';
    root.dataset.modelBounds = `${bounds.width.toFixed(2)}x${bounds.height.toFixed(2)}x${bounds.depth.toFixed(2)}`;
    root.dataset.motion = 'smooth-time-scroll-pointer-spin-revolution';
    if (fallback) fallback.hidden = true;
    animate();

    return { root, renderer, scene, camera, group, frameId };
  }

  async function start() {
    try {
      const instances = await Promise.all(roots.map(initRoot));
      window.__TAIYZUN_AT_LOGO_3D__.ready = true;
      window.__TAIYZUN_AT_LOGO_3D__.instances = instances.filter(Boolean).length;
    } catch (error) {
      roots.forEach((root) => {
        root.dataset.status = 'fallback';
        root.dataset.error = error?.message ? error.message.slice(0, 96) : 'at-logo-3d-fallback';
      });
    }
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 1800 });
  } else {
    window.setTimeout(start, 600);
  }
})();
