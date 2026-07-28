/* ==========================================================================
   NEXUS-AI THREE.JS BACKGROUND NEURAL PARTICLE NETWORK
   Interactive Floating Neural Nodes with Dynamic Synaptic Connections
   ========================================================================== */

class NeuralBackgroundVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.z = 400;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.particleCount = 110;
    this.maxDistance = 140;

    this.initParticles();
    this.bindEvents();
    this.animate();
  }

  initParticles() {
    this.particlesData = [];
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.linesPositions = new Float32Array(this.particleCount * this.particleCount * 6);

    const pGeometry = new THREE.BufferGeometry();
    const r = 500;

    for (let i = 0; i < this.particleCount; i++) {
      const x = Math.random() * r - r / 2;
      const y = Math.random() * r - r / 2;
      const z = Math.random() * r - r / 2;

      this.particlePositions[i * 3] = x;
      this.particlePositions[i * 3 + 1] = y;
      this.particlePositions[i * 3 + 2] = z;

      this.particlesData.push({
        velocity: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2).multiplyScalar(0.6),
        numConnections: 0
      });
    }

    pGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const pMaterial = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 3.5,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.pointCloud = new THREE.Points(pGeometry, pMaterial);
    this.scene.add(this.pointCloud);

    // Synaptic Lines Geometry
    const lGeometry = new THREE.BufferGeometry();
    lGeometry.setAttribute('position', new THREE.BufferAttribute(this.linesPositions, 3));

    const lMaterial = new THREE.LineBasicMaterial({
      color: 0x8a2be2,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    this.linesMesh = new THREE.LineSegments(lGeometry, lMaterial);
    this.scene.add(this.linesMesh);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    let vertexpos = 0;
    let numConnected = 0;

    for (let i = 0; i < this.particleCount; i++) {
      this.particlesData[i].numConnections = 0;
    }

    const positions = this.pointCloud.geometry.attributes.position.array;

    for (let i = 0; i < this.particleCount; i++) {
      const pData = this.particlesData[i];

      // Update positions
      positions[i * 3] += pData.velocity.x;
      positions[i * 3 + 1] += pData.velocity.y;
      positions[i * 3 + 2] += pData.velocity.z;

      // Bounce off boundary limits
      if (positions[i * 3 + 1] < -250 || positions[i * 3 + 1] > 250) pData.velocity.y = -pData.velocity.y;
      if (positions[i * 3] < -350 || positions[i * 3] > 350) pData.velocity.x = -pData.velocity.x;
      if (positions[i * 3 + 2] < -250 || positions[i * 3 + 2] > 250) pData.velocity.z = -pData.velocity.z;

      // Connect nearby particles with synaptic lines
      for (let j = i + 1; j < this.particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < this.maxDistance) {
          this.linesPositions[vertexpos++] = positions[i * 3];
          this.linesPositions[vertexpos++] = positions[i * 3 + 1];
          this.linesPositions[vertexpos++] = positions[i * 3 + 2];

          this.linesPositions[vertexpos++] = positions[j * 3];
          this.linesPositions[vertexpos++] = positions[j * 3 + 1];
          this.linesPositions[vertexpos++] = positions[j * 3 + 2];

          numConnected++;
        }
      }
    }

    this.pointCloud.geometry.attributes.position.needsUpdate = true;
    this.linesMesh.geometry.attributes.position.needsUpdate = true;
    this.linesMesh.geometry.setDrawRange(0, numConnected * 2);

    // Slowly rotate background neural sphere
    this.scene.rotation.y += 0.001;
    this.scene.rotation.x += 0.0005;

    this.renderer.render(this.scene, this.camera);
  }
}

window.initNeuralBackground = function(containerId) {
  return new NeuralBackgroundVisualizer(containerId);
};
