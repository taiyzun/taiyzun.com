(() => {
  const root = document.querySelector('[data-sword-hero]');
  if (!root || root.dataset.swordHeroReady === 'true') return;

  const canvas = root.querySelector('[data-sword-hero-canvas]');
  const fallback = root.querySelector('[data-sword-hero-fallback]');
  if (!canvas) return;

  root.dataset.swordHeroReady = 'true';
  root.dataset.status = 'loading';

  const hero = root.closest('.hero');
  const modelSrc = root.dataset.swordModel || '/assets/models/taiyzun-sword-logo-samurai-sharp-web.glb';
  const textureSrc = root.dataset.swordSrc || '/assets/images/taiyzun-sword-logo-samurai-sharp-clean-transparent.webp';
  const fallbackSrc = root.dataset.swordFallback || '/assets/images/taiyzun-sword-logo-samurai-sharp-clean-transparent.png';
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
  let keyLight = null;
  let fillLight = null;
  let rimLight = null;
  let frameId = 0;
  let animationStartTime = 0;
  let lastMotionDatasetUpdate = 0;
  let visible = true;
  let width = 1;
  let height = 1;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const scroll = { y: 0, ty: 0, hero: 0, thero: 0 };
  const baseTransform = { x: 0, y: 0, z: 0, scale: 1 };

  function setStatus(status) {
    root.dataset.status = status;
    if (hero) hero.dataset.swordReady = String(status === 'ready');
    if (fallback) {
      const fallbackInactive = status === 'ready';
      fallback.hidden = fallbackInactive;
      fallback.style.display = fallbackInactive ? 'none' : '';
      fallback.setAttribute('aria-hidden', fallbackInactive ? 'true' : 'false');
    }
  }

  function showFallback() {
    setStatus('fallback');
    if (fallback) fallback.hidden = false;
  }

  function syncPerformanceMode() {
    largeViewportMode = detectLargeViewportMode();
    root.dataset.performanceMode = compactMode ? 'compact' : largeViewportMode ? 'large-viewport-smooth' : 'rich';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateScrollMotion() {
    const documentElement = document.documentElement;
    const maxScroll = Math.max(1, documentElement.scrollHeight - window.innerHeight);
    scroll.ty = clamp(window.scrollY / maxScroll, 0, 1);

    if (!hero) {
      scroll.thero = scroll.ty;
      return;
    }

    const rect = hero.getBoundingClientRect();
    const heroHeight = Math.max(rect.height, 1);
    scroll.thero = clamp(-rect.top / heroHeight, 0, 1);
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

  function prepareMetallicGoldSword(THREE, object) {
    object.traverse((child) => {
      if (!child.isMesh) return;

      if (child.geometry && typeof child.geometry.computeVertexNormals === 'function') {
        child.geometry.computeVertexNormals();
      }

      const materialOptions = {
        color: 0xd4a43a,
        metalness: 0.94,
        roughness: 0.18,
        envMapIntensity: 1.18,
        side: THREE.DoubleSide
      };

      child.material = THREE.MeshPhysicalMaterial
        ? new THREE.MeshPhysicalMaterial({
            ...materialOptions,
            clearcoat: 0.52,
            clearcoatRoughness: 0.22,
            reflectivity: 0.74
          })
        : new THREE.MeshStandardMaterial(materialOptions);
      child.material.needsUpdate = true;
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
    });
  }

  function normalizeModelToSwordFrame(THREE, object, targetHeight) {
    object.updateMatrixWorld(true);

    const firstBox = new THREE.Box3().setFromObject(object);
    const firstSize = new THREE.Vector3();
    firstBox.getSize(firstSize);

    if (firstSize.z > firstSize.y * 1.35 && firstSize.z > firstSize.x * 1.35) {
      object.rotation.x = -Math.PI / 2;
    } else if (firstSize.x > firstSize.y * 1.35 && firstSize.x > firstSize.z * 1.35) {
      object.rotation.z = Math.PI / 2;
    }

    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (!Number.isFinite(size.y) || size.y <= 0.0001) {
      throw new Error('Sword GLB has invalid bounds');
    }

    object.position.x -= center.x;
    object.position.y -= center.y;
    object.position.z -= center.z;

    const scale = targetHeight / size.y;
    object.scale.multiplyScalar(scale);

    return {
      width: size.x * scale,
      height: size.y * scale,
      depth: size.z * scale,
      scale
    };
  }

  async function createModelSwordGroup(THREE) {
    const { GLTFLoader } = await import('./vendor/GLTFLoader.js?v=20260703a');
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(modelSrc, resolve, undefined, reject);
    });
    const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);

    if (!model) {
      throw new Error('Sword GLB scene missing');
    }

    const group = new THREE.Group();
    group.name = 'TaiyzunSwordHero';
    group.userData.modelAsset = true;
    prepareMetallicGoldSword(THREE, model);

    const bounds = normalizeModelToSwordFrame(THREE, model, 5.2);
    group.add(model);

    root.dataset.geometry = 'glb-production-model';
    root.dataset.model = modelSrc;
    root.dataset.modelBounds = `${bounds.width.toFixed(2)}x${bounds.height.toFixed(2)}x${bounds.depth.toFixed(2)}`;
    root.dataset.object = 'taiyzun-sword-logo-samurai-sharp-web';
    return group;
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
    camera.position.z = width < 760 ? 7.55 : largeViewportMode ? 6.35 : 6.55;
    camera.updateProjectionMatrix();

    if (swordGroup) {
      const modelAsset = Boolean(swordGroup.userData.modelAsset);
      baseTransform.z = 0;

      if (width < 760) {
        baseTransform.x = 0;
        baseTransform.y = 0.62;
        baseTransform.scale = 0.86;
      } else if (modelAsset) {
        baseTransform.x = largeViewportMode ? 1.5 : 1.44;
        baseTransform.y = largeViewportMode ? 0.54 : 0.58;
        baseTransform.scale = largeViewportMode ? 0.62 : 0.58;
      } else {
        baseTransform.x = 1.28;
        baseTransform.y = -0.08;
        baseTransform.scale = 1;
      }

      swordGroup.position.set(baseTransform.x, baseTransform.y, baseTransform.z);
      swordGroup.scale.setScalar(baseTransform.scale);
    }
  }

  function handleResize() {
    resize();
    updateScrollMotion();
  }

  function animate(now = 0) {
    frameId = window.requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !swordGroup || !visible) return;

    if (!animationStartTime) animationStartTime = now;
    const t = (now - animationStartTime) * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.055;
    pointer.y += (pointer.ty - pointer.y) * 0.055;
    scroll.y += (scroll.ty - scroll.y) * 0.052;
    scroll.hero += (scroll.thero - scroll.hero) * 0.062;

    const baseYaw = compactMode ? -0.18 : -0.28;
    const motionSpeed = compactMode || largeViewportMode ? 0.72 : 0.92;
    const spin = reduceMotion ? scroll.hero * 0.16 : t * secondHandSweepSpeed * motionSpeed;
    const orbitPhase = spin + scroll.hero * Math.PI * 0.84;
    const orbitStrength = compactMode ? 0.075 : largeViewportMode ? 0.13 : 0.18;
    const scrollYaw = scroll.hero * (compactMode ? 0.22 : 0.48);
    const pointerYaw = pointer.x * (compactMode ? 0.12 : 0.24);
    const pointerPitch = pointer.y * (compactMode ? 0.045 : 0.072);
    const breathing = reduceMotion ? 1 : 1 + Math.sin(t * secondHandSweepSpeed * 1.18) * 0.018;

    swordGroup.rotation.y = baseYaw + spin + scrollYaw + pointerYaw;
    swordGroup.rotation.x = Math.sin(t * secondHandSweepSpeed * 1.35) * 0.045 - pointerPitch + scroll.hero * 0.035;
    swordGroup.rotation.z = Math.sin(t * secondHandSweepSpeed * 0.82) * 0.024 + pointer.x * 0.018 + scroll.y * 0.018;
    swordGroup.position.x = baseTransform.x + Math.sin(orbitPhase) * orbitStrength + pointer.x * 0.085;
    swordGroup.position.y = baseTransform.y + Math.cos(orbitPhase * 0.76) * orbitStrength * 0.46 - scroll.hero * 0.18 - pointer.y * 0.052;
    swordGroup.position.z = baseTransform.z + Math.sin(orbitPhase * 1.22) * (compactMode ? 0.05 : 0.12) + scroll.hero * 0.14 + scroll.y * 0.05;
    swordGroup.scale.setScalar(baseTransform.scale * breathing * (1 - scroll.hero * 0.035 + Math.abs(pointer.x) * 0.01));

    if (keyLight) {
      keyLight.position.x = 3.2 + pointer.x * 0.8 + Math.sin(orbitPhase) * 0.22;
      keyLight.position.y = 4.1 - pointer.y * 0.34 + scroll.hero * 0.24;
    }

    if (fillLight) {
      fillLight.position.x = -2.8 + pointer.x * 0.42;
      fillLight.intensity = 0.64 + scroll.hero * 0.12;
    }

    if (rimLight) {
      rimLight.intensity = 1.2 + Math.abs(pointer.x) * 0.22 + scroll.hero * 0.18;
    }

    if (now - lastMotionDatasetUpdate > 240) {
      lastMotionDatasetUpdate = now;
      root.dataset.rotationY = swordGroup.rotation.y.toFixed(3);
      root.dataset.scrollMotion = scroll.hero.toFixed(3);
      root.dataset.revolution = `${swordGroup.position.x.toFixed(2)},${swordGroup.position.y.toFixed(2)},${swordGroup.position.z.toFixed(2)}`;
    }
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

      scene.add(new THREE.AmbientLight(0xffedbf, 1.22));
      scene.add(new THREE.HemisphereLight(0xfff2cf, 0x4b3820, 0.72));

      keyLight = new THREE.DirectionalLight(0xffffff, 2.75);
      keyLight.position.set(3.4, 4.25, 5.65);
      scene.add(keyLight);

      fillLight = new THREE.DirectionalLight(0x8fb1ff, 0.64);
      fillLight.position.set(-2.8, -0.8, 3.3);
      scene.add(fillLight);

      rimLight = new THREE.DirectionalLight(0xffc86c, 1.2);
      rimLight.position.set(-4.5, 1.6, -3.5);
      scene.add(rimLight);

      if (!compactMode && modelSrc) {
        try {
          swordGroup = await createModelSwordGroup(THREE);
        } catch (modelError) {
          root.dataset.modelError = modelError && modelError.message
            ? modelError.message.slice(0, 96)
            : 'sword-hero-glb-fallback';
        }
      }

      if (!swordGroup) {
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

        root.dataset.texture = textureSrc;
        root.dataset.object = 'taiyzun-sword-logo-samurai-sharp-clean-transparent';
      }

      scene.add(swordGroup);
      resize();
      updateScrollMotion();
      setStatus('ready');
      syncPerformanceMode();
      root.dataset.lighting = 'ambient-hemisphere-key-fill-rim';
      root.dataset.motion = reduceMotion ? 'reduced-scroll-aware-pose' : 'smooth-time-scroll-pointer-revolution';

      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('scroll', updateScrollMotion, { passive: true });
      window.addEventListener('pointermove', (event) => {
        if (reduceMotion) return;
        pointer.tx = Math.max(-1, Math.min(1, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2));
        pointer.ty = Math.max(-1, Math.min(1, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2));
      }, { passive: true });
      window.addEventListener('pointerleave', () => {
        pointer.tx = 0;
        pointer.ty = 0;
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
