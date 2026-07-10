(() => {
  const MODEL_URL = '/3d/Taiyzun_Sword_Web.glb';
  const MAX_YAW = Math.PI / 18;
  const MAX_PITCH = Math.PI / 51.43;
  const stages = Array.from(document.querySelectorAll('[data-taiyzun-sword]'));

  if (!stages.length) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactQuery = window.matchMedia('(max-width: 820px), (pointer: coarse)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const constrainedConnection = Boolean(
    connection?.saveData ||
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4)
  );

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const damp = (current, target, smoothing, delta) => {
    return current + (target - current) * (1 - Math.exp(-smoothing * delta));
  };

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

  function enforceContainment(stage) {
    const canvas = stage.querySelector('[data-taiyzun-sword-canvas]');
    const fallback = stage.querySelector('[data-taiyzun-sword-fallback]');

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

  async function initialiseStage(stage) {
    if (stage.dataset.initialised === 'true') return;
    stage.dataset.initialised = 'true';

    const canvas = stage.querySelector('[data-taiyzun-sword-canvas]');
    const fallback = stage.querySelector('[data-taiyzun-sword-fallback]');
    if (!canvas || !hasWebGLSupport()) {
      markStatic(stage, 'webgl-unavailable');
      return;
    }

    stage.dataset.status = 'loading';

    try {
      const [THREE, loaderModule] = await Promise.all([
        import('./vendor/three.module.min.js'),
        import('./vendor/GLTFLoader.js')
      ]);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 0, 2.68);

      scene.add(new THREE.AmbientLight(0xffffff, 0.22));

      const keyLight = new THREE.DirectionalLight(0xfff4d6, 2.5);
      keyLight.position.set(-2.5, 3.5, 4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xffc861, 1.5);
      rimLight.position.set(2.8, 0.5, 2.4);
      scene.add(rimLight);

      const lowerLight = new THREE.PointLight(0xc7d8ff, 0.8);
      lowerLight.position.set(0, -0.6, 2);
      scene.add(lowerLight);

      const loader = new loaderModule.GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.load(MODEL_URL, resolve, undefined, reject);
      });
      const model = gltf.scene || gltf.scenes?.[0];
      if (!model) throw new Error('Taiyzun sword scene is missing');

      const root = new THREE.Group();
      root.name = 'TaiyzunSword';
      root.add(model);
      root.scale.setScalar(1.08);
      scene.add(root);

      const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      let width = 1;
      let height = 1;
      let frame = 0;
      let lastTime = performance.now();
      let lastStatusUpdate = 0;
      let visible = true;

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
        const bounds = stage.getBoundingClientRect();
        pointer.targetX = clamp(((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2, -1, 1);
        pointer.targetY = clamp(((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2, -1, 1);
      }

      function resetPointer() {
        pointer.targetX = 0;
        pointer.targetY = 0;
      }

      function render(now) {
        frame = window.requestAnimationFrame(render);
        if (!visible || document.hidden) return;

        const delta = Math.min((now - lastTime) / 1000, 0.05);
        const elapsed = now / 1000;
        lastTime = now;
        const reduceMotion = reducedMotionQuery.matches;

        pointer.x = damp(pointer.x, reduceMotion ? 0 : pointer.targetX, 4, delta);
        pointer.y = damp(pointer.y, reduceMotion ? 0 : pointer.targetY, 4, delta);
        root.rotation.y = pointer.x * MAX_YAW;
        root.rotation.x = -pointer.y * MAX_PITCH;
        root.rotation.z = 0;
        root.position.x = 0;
        root.position.y = reduceMotion ? 0 : Math.sin(elapsed * 0.32) * 0.006;
        root.position.z = 0;

        const breath = reduceMotion ? 1 : 1 + Math.sin(elapsed * 0.32) * 0.0025;
        root.scale.setScalar(1.08 * breath);
        if (now - lastStatusUpdate >= 250) {
          lastStatusUpdate = now;
          stage.dataset.rotationX = root.rotation.x.toFixed(4);
          stage.dataset.rotationY = root.rotation.y.toFixed(4);
        }
        renderer.render(scene, camera);
      }

      renderer.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        window.cancelAnimationFrame(frame);
        stage.dataset.status = 'static';
        fallback?.removeAttribute('hidden');
      });

      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', updatePointer, { passive: true });
      window.addEventListener('pointerleave', resetPointer, { passive: true });

      if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stage);
      }

      if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
        }, { threshold: 0.01 });
        visibilityObserver.observe(stage);
      }

      resize();
      stage.dataset.model = MODEL_URL;
      stage.dataset.orientation = 'y-up-front-facing';
      stage.dataset.motion = 'pointer-parallax-10deg-slow-breathing';
      stage.dataset.status = 'ready';
      fallback?.setAttribute('hidden', '');
      frame = window.requestAnimationFrame(render);
    } catch (error) {
      stage.dataset.status = 'static';
      stage.dataset.error = error instanceof Error ? error.message.slice(0, 120) : 'sword-load-failed';
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
})();
