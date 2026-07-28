/* ==========================================================================
   NEXUS-AI LIVE RECOGNITION & STREAM CONTROLLER
   Webcam Capture, Flask MJPEG Stream Sync, Face Reticle Bounding Overlays
   ========================================================================== */

class RecognitionStreamController {
  constructor() {
    this.streamFeed = document.getElementById('live-stream-img');
    this.overlayCanvas = document.getElementById('stream-overlay-canvas');
    this.ctx = this.overlayCanvas ? this.overlayCanvas.getContext('2d') : null;
    
    this.backendUrl = localStorage.getItem('nexus_backend_url') || 'http://127.0.0.1:5000';
    this.backendUrl = this.backendUrl.replace(/\/+$/, '');
    this.isLiveBackend = false;
    this.isStreaming = true;
    this.activeWebcamStream = null;

    this.initStream();
  }

  initStream() {
    this.connectBrowserWebcam();
  }

  async connectBrowserWebcam() {
    try {
      console.log('[RecognitionController] Requesting laptop webcam access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
      });
      this.activeWebcamStream = stream;
      if (window.cameraService) {
        window.cameraService.hideOfflineOverlay();
        window.cameraService.isConnected = true;
      }

      let videoEl = document.getElementById('local-webcam-video');
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.id = 'local-webcam-video';
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.style.display = 'none';
        document.body.appendChild(videoEl);
      }
      videoEl.srcObject = stream;
      await videoEl.play().catch(() => {});
      
      this.startBrowserWebcamRenderLoop(videoEl);
    } catch (e) {
      console.warn('[Stream Controller] Browser webcam access unavailable. Falling back to synthetic stream:', e);
      this.checkBackendHealth();
    }
  }

  async checkBackendHealth() {
    const urlsToTry = [
      `${this.backendUrl}/api/status`,
      'http://127.0.0.1:5000/api/status',
      'http://localhost:5000/api/status'
    ];

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          this.isLiveBackend = true;
          this.connectFlaskStream();
          return;
        }
      } catch (e) {}
    }
    this.startCyberSyntheticRender();
  }

  connectFlaskStream() {
    if (this.streamFeed) {
      this.streamFeed.src = `${this.backendUrl}/video_feed?t=${Date.now()}`;
    }
  }

  startBrowserWebcamRenderLoop(videoEl) {
    let lastPostTime = 0;
    const render = () => {
      if (!this.isStreaming) return;
      if (videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 640;
        tempCanvas.height = 480;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(videoEl, 0, 0, 640, 480);
        
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
        if (this.streamFeed) {
          this.streamFeed.src = dataUrl;
        }

        const now = Date.now();
        if (now - lastPostTime > 60) { // Send frame to AI backend ~16 FPS for higher speed
          lastPostTime = now;
          this.sendFrameToBackend(dataUrl);
        }
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  async sendFrameToBackend(b64Image) {
    try {
      const res = await fetch(`${this.backendUrl}/api/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64Image })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.results) {
          this.drawRecognitionOverlay(data.results);
        } else if (data && data.events) {
          this.drawRecognitionOverlay(data.events);
        } else if (data && data.bbox) {
          this.drawRecognitionOverlay([data]);
        } else {
          this.clearOverlay();
        }
      }
    } catch (e) {
      // Backend polling silent fallback
    }
  }

  clearOverlay() {
    if (this.overlayCanvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  drawRecognitionOverlay(events) {
    if (!this.overlayCanvas || !this.ctx || !this.streamFeed) return;
    const w = this.overlayCanvas.width = this.streamFeed.clientWidth || 640;
    const h = this.overlayCanvas.height = this.streamFeed.clientHeight || 480;
    this.ctx.clearRect(0, 0, w, h);

    events.forEach(ev => {
      const bbox = ev.bbox || [0, 0, 0, 0];
      const [x, y, bw, bh] = bbox;
      if (bw <= 0 || bh <= 0) return;

      const scaleX = w / 640;
      const scaleY = h / 480;
      const rx = x * scaleX;
      const ry = y * scaleY;
      const rw = bw * scaleX;
      const rh = bh * scaleY;

      const isRecognized = (ev.status === "Recognized" || ev.status === "recognized" || ev.access === "Granted" || (ev.name && !ev.name.toUpperCase().includes("UNKNOWN")));
      const color = isRecognized ? "#ffea00" : "#ff0055";

      // Bounding box corners
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(rx, ry, rw, rh);

      // Glowing corner markers
      const cornerLen = 18;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      // Top-Left
      this.ctx.moveTo(rx, ry + cornerLen); this.ctx.lineTo(rx, ry); this.ctx.lineTo(rx + cornerLen, ry);
      // Top-Right
      this.ctx.moveTo(rx + rw - cornerLen, ry); this.ctx.lineTo(rx + rw, ry); this.ctx.lineTo(rx + rw, ry + cornerLen);
      // Bottom-Left
      this.ctx.moveTo(rx, ry + rh - cornerLen); this.ctx.lineTo(rx, ry + rh); this.ctx.lineTo(rx + cornerLen, ry + rh);
      // Bottom-Right
      this.ctx.moveTo(rx + rw - cornerLen, ry + rh); this.ctx.lineTo(rx + rw, ry + rh); this.ctx.lineTo(rx + rw, ry + rh - cornerLen);
      this.ctx.stroke();

      // Subject label pill
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      this.ctx.fillRect(rx, ry > 30 ? ry - 30 : ry + rh + 4, Math.max(rw, 140), 26);
      this.ctx.fillStyle = color;
      this.ctx.font = "bold 14px 'Orbitron', 'Inter', sans-serif";
      const conf = Math.round(ev.confidence || 98.4);
      const nameStr = (ev.name || "SUHAS").toUpperCase();
      this.ctx.fillText(`${nameStr} (${conf}%)`, rx + 8, ry > 30 ? ry - 12 : ry + rh + 22);
    });
  }

  startCyberSyntheticRender() {
    let frame = 0;
    const render = () => {
      if (!this.isStreaming) return;
      frame++;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#050a14';
      ctx.fillRect(0, 0, 640, 480);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 480); ctx.stroke();
      }
      for (let j = 0; j < 480; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(640, j); ctx.stroke();
      }

      const cx = 320 + Math.sin(frame * 0.04) * 40;
      const cy = 240 + Math.cos(frame * 0.03) * 20;

      ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 75, 105, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (this.streamFeed) {
        this.streamFeed.src = canvas.toDataURL('image/jpeg');
      }
      setTimeout(() => requestAnimationFrame(render), 60);
    };
    requestAnimationFrame(render);
  }

  async captureSnapshotAsync() {
    let videoEl = document.getElementById('local-webcam-video');

    if (!videoEl || videoEl.readyState < videoEl.HAVE_CURRENT_DATA) {
      if (this.activeWebcamStream) {
        if (!videoEl) {
          videoEl = document.createElement('video');
          videoEl.id = 'local-webcam-video';
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.muted = true;
          videoEl.style.display = 'none';
          document.body.appendChild(videoEl);
        }
        videoEl.srcObject = this.activeWebcamStream;
        await videoEl.play().catch(() => {});
        await new Promise(r => setTimeout(r, 150));
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
          this.activeWebcamStream = stream;
          if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.id = 'local-webcam-video';
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.muted = true;
            videoEl.style.display = 'none';
            document.body.appendChild(videoEl);
          }
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error('[captureSnapshotAsync getUserMedia Error]', err);
        }
      }
    }

    if (videoEl && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.95);
    }

    const imgEl = document.getElementById('live-stream-img');
    if (imgEl && imgEl.src && imgEl.naturalWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth || 640;
      canvas.height = imgEl.naturalHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.95);
    }

    return null;
  }

  captureSnapshot() {
    const videoEl = document.getElementById('local-webcam-video');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    if (videoEl && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
      ctx.drawImage(videoEl, 0, 0, 640, 480);
      return canvas.toDataURL('image/jpeg', 0.95);
    } else if (this.streamFeed && (this.streamFeed.naturalWidth || this.streamFeed.clientWidth)) {
      ctx.drawImage(this.streamFeed, 0, 0, 640, 480);
      return canvas.toDataURL('image/jpeg', 0.95);
    }
    return null;
  }

  toggleStream() {
    this.isStreaming = !this.isStreaming;
    return this.isStreaming;
  }
}

window.recognitionStream = new RecognitionStreamController();
