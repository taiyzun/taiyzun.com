/**
 * WEBGL / CANVAS MANAGER
 * Manages Three.js and PixiJS effects for advanced visual animations
 * Handles hero sections, particle systems, and interactive 3D visualizations
 */

class WebGLManager {
  constructor() {
    this.effects = {};
    this.canvases = {};
    this.scenes = {};
    this.initialized = false;
    this.performanceMode = this.detectPerformanceMode();
  }

  /**
   * Detect performance mode based on device capabilities
   * @returns {string} 'high', 'medium', or 'low'
   */
  detectPerformanceMode() {
    // Check for low-end devices
    if (!navigator.hardwareConcurrency || navigator.hardwareConcurrency <= 2) {
      return 'low';
    }

    // Check device memory
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) {
      return 'medium';
    }

    // Check for mobile
    if (/mobile|android|iphone/i.test(navigator.userAgent)) {
      return 'medium';
    }

    return 'high';
  }

  /**
   * Initialize WebGL manager
   */
  init() {
    if (this.initialized) return;

    // Detect current page and initialize appropriate effects
    const currentPage = this.detectCurrentPage();

    if (currentPage === 'home') {
      this.initHomeParticles();
    } else if (currentPage === 'journey') {
      this.initJourneyTimeline();
    } else if (currentPage === 'creations') {
      this.initCreationsGallery();
    } else if (currentPage === 'odyssey') {
      this.initOdysseyNarrative();
    } else if (currentPage === 'connect') {
      this.initConnectNetwork();
    }

    this.initialized = true;
    console.log(`🎨 WebGL Manager initialized (${this.performanceMode} performance mode)`);
  }

  /**
   * Detect current page
   * @returns {string} Page name
   */
  detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';

    if (filename.includes('journey')) return 'journey';
    if (filename.includes('creations')) return 'creations';
    if (filename.includes('odyssey')) return 'odyssey';
    if (filename.includes('connect')) return 'connect';
    return 'home';
  }

  /**
   * HOME PAGE - Animated Particle System
   * Creates prismatic particle animation reflecting multifaceted identity
   */
  initHomeParticles() {
    const container = document.querySelector('[data-webgl="home-particles"]');
    if (!container) {
      // Create container if it doesn't exist
      const heroSection = document.querySelector('.hero-section');
      if (heroSection) {
        const webglContainer = document.createElement('div');
        webglContainer.id = 'home-particles-webgl';
        webglContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        `;
        heroSection.appendChild(webglContainer);
      }
      return;
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Particle configuration based on performance mode
    const particleCount = this.performanceMode === 'high' ? 150 :
                         this.performanceMode === 'medium' ? 80 : 40;

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      hue: Math.random() * 360
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, 0.7)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p2.x - p.x;
          const dy = p2.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.strokeStyle = `hsla(${p.hue}, 100%, 60%, ${0.3 * (1 - distance / 150)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();
    this.canvases.homeParticles = canvas;
  }

  /**
   * JOURNEY PAGE - 3D Timeline Visualization
   * Creates flowing 3D ribbon timeline
   */
  initJourneyTimeline() {
    if (!THREE) return;

    const container = document.querySelector('[data-webgl="journey-timeline"]');
    if (!container) {
      const heroSection = document.querySelector('.hero-section');
      if (heroSection) {
        const webglContainer = document.createElement('div');
        webglContainer.id = 'journey-timeline-webgl';
        webglContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        `;
        heroSection.appendChild(webglContainer);
      }
      return;
    }

    // Create Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0.1);
    container.appendChild(renderer.domElement);

    camera.position.z = 5;

    // Create flowing ribbon (sine wave)
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(10, 0, 0)
    );

    const points = curve.getPoints(100);
    const modifiedPoints = points.map((p, i) => {
      const wave = Math.sin(i * 0.1) * 2;
      return new THREE.Vector3(p.x, wave, p.z);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(modifiedPoints);

    const material = new THREE.LineBasicMaterial({ color: 0x7c5cff, linewidth: 3 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Add rotating cubes at milestones
    for (let i = 0; i < modifiedPoints.length; i += 20) {
      const cubeGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const cubeMat = new THREE.MeshBasicMaterial({ color: 0xff6b9d });
      const cube = new THREE.Mesh(cubeGeom, cubeMat);
      cube.position.copy(modifiedPoints[i]);
      scene.add(cube);
    }

    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate the scene
      scene.rotation.x += 0.0005;
      scene.rotation.z += 0.0003;

      renderer.render(scene, camera);
    };

    animate();
    this.scenes.journeyTimeline = { scene, camera, renderer };

    // Handle window resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * CREATIONS PAGE - Interactive 3D Gallery Grid
   * Creates floating gallery items with 3D rotation
   */
  initCreationsGallery() {
    if (!THREE) return;

    const container = document.querySelector('[data-webgl="creations-gallery"]');
    if (!container) return;

    // Create simple particle effect
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      size: Math.random() * 2 + 1,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();
    this.canvases.creationsGallery = canvas;
  }

  /**
   * ODYSSEY PAGE - Flowing Ink Animation
   * Creates poetic flowing ink/watercolor background
   */
  initOdysseyNarrative() {
    const container = document.querySelector('[data-webgl="odyssey-narrative"]');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Create flowing blobs
    const blobs = Array.from({ length: 5 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 200 + 100,
      hue: 30 + Math.random() * 30,
      opacity: 0.1
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(blob => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Bounce off walls
        if (blob.x - blob.size < 0 || blob.x + blob.size > canvas.width) blob.vx *= -1;
        if (blob.y - blob.size < 0 || blob.y + blob.size > canvas.height) blob.vy *= -1;

        // Draw blob with blur
        ctx.fillStyle = `hsla(${blob.hue}, 100%, 50%, ${blob.opacity})`;
        ctx.filter = 'blur(40px)';
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
      });

      requestAnimationFrame(animate);
    };

    animate();
    this.canvases.odysseyNarrative = canvas;
  }

  /**
   * CONNECT PAGE - Network Graph Animation
   * Creates animated network nodes and connections
   */
  initConnectNetwork() {
    const container = document.querySelector('[data-webgl="connect-network"]');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Create network nodes
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      x: Math.cos(i / 6 * Math.PI) * 200 + canvas.width / 2,
      y: Math.sin(i / 6 * Math.PI) * 200 + canvas.height / 2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 10,
      color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        // Gentle drift
        node.vx += (Math.random() - 0.5) * 0.02;
        node.vy += (Math.random() - 0.5) * 0.02;

        // Bounds checking
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const node2 = nodes[j];
          const dx = node2.x - node.x;
          const dy = node2.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 300) {
            ctx.strokeStyle = `hsla(180, 100%, 60%, ${0.2 * (1 - distance / 300)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(node2.x, node2.y);
            ctx.stroke();
          }
        }

        // Draw node
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();
    this.canvases.connectNetwork = canvas;
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    Object.values(this.canvases).forEach(canvas => {
      canvas.remove();
    });

    Object.values(this.scenes).forEach(scene => {
      if (scene.renderer) {
        scene.renderer.dispose();
        scene.renderer.domElement.remove();
      }
    });

    this.canvases = {};
    this.scenes = {};
  }
}

// Create global instance
const webglManager = new WebGLManager();

// Auto-initialize when DOM and libraries are ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for libraries to be available
    setTimeout(() => {
      webglManager.init();
    }, 100);
  });
} else {
  setTimeout(() => {
    webglManager.init();
  }, 100);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebGLManager;
}
