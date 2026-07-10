(() => {
  const MODEL_CONFIG = {
    sword: {
      modelUrl: '/3d/Taiyzun_Sword_Web.glb',
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
      motion: 'pointer-parallax-10deg-slow-breathing'
    },
    at: {
      modelUrl: '/3d/Taiyzun_At_Logo_Web.glb',
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
      motion: 'pointer-parallax-6deg-slow-breathing'
    }
  };
  const stages = Array.from(document.querySelectorAll('[data-taiyzun-sword], [data-taiyzun-at]'));

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

  function applyMetalFinish(objectType, model) {
    model.traverse((child) => {
      if (!child.isMesh) return;

      if (child.geometry && !child.geometry.getAttribute('normal')) {
        child.geometry.computeVertexNormals();
      }

      const applyMaterial = (sourceMaterial) => {
        const material = sourceMaterial.clone();
        const materialName = (material.name || '').toLowerCase();

        material.map = null;

        if (objectType === 'at') {
          material.color.setHex(0xd9b35a);
          material.metalness = 0.78;
          material.roughness = 0.23;
          material.emissive?.setHex(0x241504);
          material.emissiveIntensity = 0.12;
        } else if (materialName.includes('edge')) {
          material.color.setHex(0xe9eef3);
          material.metalness = 0.78;
          material.roughness = 0.16;
          material.emissive?.setHex(0x202225);
          material.emissiveIntensity = 0.1;
        } else if (materialName.includes('bevel')) {
          material.color.setHex(0xd9dee5);
          material.metalness = 0.82;
          material.roughness = 0.18;
          material.emissive?.setHex(0x20242a);
          material.emissiveIntensity = 0.1;
        } else {
          material.color.setHex(0xd4a944);
          material.metalness = 0.72;
          material.roughness = 0.28;
          material.emissive?.setHex(0x2f1d02);
          material.emissiveIntensity = 0.18;
        }

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
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(config.fieldOfView, 1, 0.1, 20);
      camera.position.set(0, 0, config.cameraZ);

      scene.add(new THREE.AmbientLight(0xffffff, config.ambient));
      scene.add(new THREE.HemisphereLight(0xfff3d6, 0x72809a, 0.75));

      const keyLight = new THREE.DirectionalLight(objectType === 'at' ? 0xffefd0 : 0xfff4d6, config.key);
      keyLight.position.set(-2.5, 3.5, 4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(objectType === 'at' ? 0xd8e8ff : 0xffc861, config.rim);
      rimLight.position.set(2.8, 0.5, 2.4);
      scene.add(rimLight);

      const lowerLight = new THREE.PointLight(0xc7d8ff, config.lower);
      lowerLight.position.set(0, -0.6, 2);
      scene.add(lowerLight);

      const loader = new loaderModule.GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.load(config.modelUrl, resolve, undefined, reject);
      });
      const model = gltf.scene || gltf.scenes?.[0];
      if (!model) throw new Error(`${config.name} scene is missing`);

      applyMetalFinish(objectType, model);

      const root = new THREE.Group();
      root.name = config.name;
      root.add(model);
      root.scale.setScalar(config.scale);
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
        root.rotation.y = pointer.x * config.maxYaw;
        root.rotation.x = -pointer.y * config.maxPitch;
        root.rotation.z = 0;
        root.position.x = config.offsetX;
        root.position.y = config.offsetY + (reduceMotion ? 0 : Math.sin(elapsed * 0.32) * 0.006);
        root.position.z = config.offsetZ;

        const breath = reduceMotion ? 1 : 1 + Math.sin(elapsed * 0.32) * 0.0025;
        root.scale.setScalar(config.scale * breath);
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
        canvas.style.opacity = '0';
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
      stage.dataset.object = objectType;
      stage.dataset.model = config.modelUrl;
      stage.dataset.orientation = objectType === 'sword' ? 'y-up-front-facing' : 'z-facing-corner-signature';
      stage.dataset.motion = config.motion;
      stage.dataset.status = 'ready';
      canvas.style.opacity = '1';
      fallback?.setAttribute('hidden', '');
      frame = window.requestAnimationFrame(render);
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
})();
