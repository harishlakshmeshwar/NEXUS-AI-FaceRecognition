/* ==========================================================================
   NEXUS-AI CAMERA SERVICE MODULE (cameraService.js)
   Handles IP Webcam stream (http://10.131.108.9:8080/video), Flask feed, fallback UI
   ========================================================================== */

class CameraService {
  constructor() {
    this.ipWebcamUrl = localStorage.getItem('nexus_ipwebcam_url') || '0';
    this.backendUrl = localStorage.getItem('nexus_backend_url') || 'http://127.0.0.1:5000';
    this.streamImgEl = null;
    this.isConnected = false;
    this.checkTimer = null;
    this.statusListeners = [];
    this.activeStreamUrl = '';
  }

  /**
   * Connect to stream image element with either backend stream or IP webcam fallback.
   */
  connect(sourceUrl = null, streamImgId = 'live-stream-img', useBackend = true) {
    if (sourceUrl) {
      if (useBackend || /:\/\/127\.0\.0\.1:5000|:\/\/localhost:5000/.test(sourceUrl)) {
        this.backendUrl = sourceUrl.replace(/\/+$/, '');
      } else {
        this.ipWebcamUrl = sourceUrl.replace(/\/+$/, '');
      }
    }

    this.streamImgEl = document.getElementById(streamImgId);
    const backendStream = `${this.backendUrl}/video_feed`;
    const webcamStream = (this.ipWebcamUrl && this.ipWebcamUrl.startsWith('http')) ? `${this.ipWebcamUrl}/video` : backendStream;
    const videoStreamUrl = (useBackend || this.ipWebcamUrl === '0' || !this.ipWebcamUrl.startsWith('http')) ? backendStream : webcamStream;
    this.activeStreamUrl = videoStreamUrl;

    if (this.streamImgEl) {
      this.streamImgEl.onload = () => {
        this.isConnected = true;
        this.notifyStatusListeners('connected');
        this.hideOfflineOverlay();
      };

      this.streamImgEl.onerror = () => {
        console.warn(`[CameraService] Stream failed at ${videoStreamUrl}.`);
        this.isConnected = false;
        this.notifyStatusListeners('offline');
        this.showOfflineOverlay();
      };

      this.streamImgEl.src = `${videoStreamUrl}?t=${Date.now()}`;
    }

    this.startStatusCheck();
  }

  /**
   * Disconnect camera stream.
   */
  disconnect() {
    console.log('[CameraService] Disconnecting camera stream...');
    if (this.streamImgEl) {
      this.streamImgEl.src = '';
    }
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.isConnected = false;
    this.notifyStatusListeners('offline');
    this.showOfflineOverlay();
  }

  /**
   * Check if camera stream is responsive.
   */
  async checkStatus() {
    if (!this.ipWebcamUrl) {
      this.isConnected = false;
      return 'offline';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // Ping IP Webcam status or video endpoint
      const response = await fetch(`${this.ipWebcamUrl}/status.json`, {
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      this.isConnected = true;
      this.notifyStatusListeners('connected');
      return 'connected';
    } catch (e) {
      // Ping image element directly
      if (this.streamImgEl && this.streamImgEl.naturalWidth > 0) {
        this.isConnected = true;
        this.notifyStatusListeners('connected');
        return 'connected';
      }
    }

    this.isConnected = false;
    this.notifyStatusListeners('offline');
    return 'offline';
  }

  /**
   * Reconnect to camera with updated URL.
   */
  async reconnect(newUrl = null) {
    this.disconnect();
    this.connect(newUrl);
  }

  startStatusCheck() {
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.checkTimer = setInterval(() => this.checkStatus(), 5000);
  }

  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
    }
  }

  notifyStatusListeners(status) {
    this.statusListeners.forEach(fn => fn(status));
  }

  showOfflineOverlay() {
    let overlay = document.getElementById('camera-offline-overlay');
    if (!overlay && this.streamImgEl && this.streamImgEl.parentElement) {
      overlay = document.createElement('div');
      overlay.id = 'camera-offline-overlay';
      overlay.style.cssText = `
        position: absolute; top:0; left:0; width:100%; height:100%;
        background: rgba(6, 11, 24, 0.85); backdrop-filter: blur(8px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: var(--cyber-red); font-family: var(--font-hud); letter-spacing: 2px;
        z-index: 10; pointer-events: none;
      `;
      overlay.innerHTML = `
        <i class="fa-solid fa-video-slash" style="font-size: 3rem; margin-bottom: 12px; text-shadow: 0 0 15px var(--cyber-red);"></i>
        <div style="font-size: 1.2rem;">CAMERA OFFLINE</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">IP STREAM UNAVAILABLE</div>
      `;
      this.streamImgEl.parentElement.appendChild(overlay);
    }
    if (overlay) overlay.style.display = 'flex';
  }

  hideOfflineOverlay() {
    const overlay = document.getElementById('camera-offline-overlay');
    if (overlay) overlay.style.display = 'none';
  }
}

// Global Singleton Instance
window.cameraService = new CameraService();
