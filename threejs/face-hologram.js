/* ==========================================================================
   NEXUS-AI THREE.JS 3D HOLOGRAPHIC FACE VISUALIZER
   Interactive Biometric Hologram with Pulse, Rings, and Wireframe Surface
   ========================================================================== */

class HologramFaceVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 22);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.faceGroup = new THREE.Group();
    this.scene.add(this.faceGroup);

    this.isPulsing = false;
    this.pulseAmount = 0;
    this.pointer = { isDown: false, startX: 0, startY: 0, targetX: 0, targetY: 0, rotationX: 0, rotationY: 0 };

    this.initHologramMesh();
    this.initScanRings();
    this.initFeatureGrid();
    this.addLighting();
    this.bindEvents();
    this.animate();
  }

  initHologramMesh() {
    const geometry = new THREE.IcosahedronGeometry(5, 4);
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      let x = positions[i];
      let y = positions[i + 1];
      let z = positions[i + 2];

      if (z < 0) z *= 0.72;
      if (y < -1.2) {
        x *= 1 + (y * 0.08);
        z *= 1 + (y * 0.08);
      }
      if (y > 2.0) x *= 1.15;
      if (Math.abs(x) < 0.5 && y > 2.2) z *= 1.05;

      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;
    }
    geometry.computeVertexNormals();

    const pointMaterial = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.24,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(geometry, pointMaterial);
    this.faceGroup.add(this.points);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x8a2be2,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending
    });
    this.wireframe = new THREE.Mesh(geometry, wireMaterial);
    this.faceGroup.add(this.wireframe);
  }

  initScanRings() {
    const ringShapes = [6.2, 6.8, 7.4];
    this.rings = ringShapes.map((radius, index) => {
      const ringGeom = new THREE.RingGeometry(radius, radius + 0.08, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x00f3ff : 0x8a2be2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.32 - index * 0.08,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
      return ring;
    });
  }

  initFeatureGrid() {
    const geometry = new THREE.BufferGeometry();
    const points = [];
    for (let i = 0; i < 120; i++) {
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const radius = 5 + Math.sin(phi * 3) * 0.3;
      points.push(Math.cos(theta) * radius, Math.sin(phi) * 1.4, Math.sin(theta) * radius);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.PointsMaterial({
      color: 0x00ff9d,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.featureDots = new THREE.Points(geometry, material);
    this.faceGroup.add(this.featureDots);
  }

  addLighting() {
    const ambient = new THREE.AmbientLight(0x88d8ff, 0.4);
    this.scene.add(ambient);

    const pointA = new THREE.PointLight(0x00f3ff, 1.6, 50);
    pointA.position.set(6, 8, 10);
    this.scene.add(pointA);

    const pointB = new THREE.PointLight(0x8a2be2, 1.2, 40);
    pointB.position.set(-8, -6, 12);
    this.scene.add(pointB);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    window.addEventListener('pointerup', () => this.onPointerUp());
    window.addEventListener('pointercancel', () => this.onPointerUp());
  }

  onResize() {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onPointerDown(event) {
    this.pointer.isDown = true;
    this.pointer.startX = event.clientX;
    this.pointer.startY = event.clientY;
    this.pointer.rotationX = this.faceGroup.rotation.x;
    this.pointer.rotationY = this.faceGroup.rotation.y;
    this.canvas.style.cursor = 'grabbing';
  }

  onPointerMove(event) {
    if (!this.pointer.isDown) return;
    const deltaX = event.clientX - this.pointer.startX;
    const deltaY = event.clientY - this.pointer.startY;
    this.faceGroup.rotation.y = this.pointer.rotationY + deltaX * 0.004;
    this.faceGroup.rotation.x = this.pointer.rotationX + deltaY * 0.003;
  }

  onPointerUp() {
    this.pointer.isDown = false;
    if (this.canvas) this.canvas.style.cursor = 'grab';
  }

  triggerPulse() {
    this.isPulsing = true;
    this.pulseAmount = 1.0;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (!this.pointer.isDown) {
      this.faceGroup.rotation.y += 0.005;
      this.faceGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.08;
    }

    this.rings.forEach((ring, index) => {
      ring.rotation.z += 0.004 + index * 0.003;
    });

    if (this.isPulsing) {
      this.pulseAmount -= 0.02;
      const value = 1 + Math.sin(this.pulseAmount * Math.PI) * 0.12;
      this.faceGroup.scale.set(value, value, value);
      if (this.pulseAmount <= 0) {
        this.isPulsing = false;
        this.faceGroup.scale.set(1, 1, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.initHologramVisualizer = function(canvasId) {
  return new HologramFaceVisualizer(canvasId);
};

/* Full-Screen Landing Intro 3D Particle Face Visualizer */
class IntroParticleFaceHead {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 24);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.headGroup = new THREE.Group();
    this.scene.add(this.headGroup);

    this.initParticleHead();
    this.initGlowingEyes();
    this.initAmbientParticles();
    this.bindResize();
    this.animate();
  }

  initParticleHead() {
    const geom = new THREE.IcosahedronGeometry(6.5, 5);
    const pos = geom.attributes.position.array;
    const particleCount = pos.length / 3;

    // Sculpt into human head proportions
    for (let i = 0; i < pos.length; i += 3) {
      let x = pos[i];
      let y = pos[i + 1];
      let z = pos[i + 2];

      if (z < 0) z *= 0.65; // flatten back
      if (y < -1.5) { x *= 1 + (y * 0.08); z *= 1 + (y * 0.08); } // jawline
      if (y > 2.5) x *= 1.1; // brow width

      pos[i] = x;
      pos[i + 1] = y;
      pos[i + 2] = z;
    }
    geom.computeVertexNormals();

    // Particle Cloud
    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.particleHead = new THREE.Points(geom, mat);
    this.headGroup.add(this.particleHead);

    // Neural Synaptic Connections Wireframe
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x7000ff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    this.wireHead = new THREE.Mesh(geom, wireMat);
    this.headGroup.add(this.wireHead);
  }

  initGlowingEyes() {
    const eyeGeom = new THREE.SphereGeometry(0.35, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-1.8, 1.2, 3.8);

    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(1.8, 1.2, 3.8);

    this.headGroup.add(leftEye);
    this.headGroup.add(rightEye);
  }

  initAmbientParticles() {
    const count = 300;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 60;
      pos[i + 1] = (Math.random() - 0.5) * 60;
      pos[i + 2] = (Math.random() - 0.5) * 60;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.18,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    this.ambientParticles = new THREE.Points(geom, mat);
    this.scene.add(this.ambientParticles);
  }

  bindResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.headGroup.rotation.y += 0.006;
    this.headGroup.rotation.x = Math.sin(Date.now() * 0.0008) * 0.08;

    if (this.ambientParticles) {
      this.ambientParticles.rotation.y -= 0.001;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.initIntroParticleFaceHead = function(containerId) {
  return new IntroParticleFaceHead(containerId);
};
