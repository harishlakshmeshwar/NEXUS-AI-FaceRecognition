/* ==========================================================================
   NEXUS-AI BACKEND SERVICE MODULE (backendService.js)
   Direct status & telemetry polling of http://127.0.0.1:5000/api/status
   Strict single backend source of truth for Camera & Model Status
   ========================================================================== */

class BackendService {
  constructor() {
    this.baseUrl = localStorage.getItem('nexus_backend_url') || 'http://127.0.0.1:5000';
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');
    
    this.isConnected = false;
    this.pollTimer = null;
    this.statusListeners = [];
    this.recognitionListeners = [];
    this.lastStatus = null;

    // Automatic GET /api/health check on webpage load
    this.checkHealthOnLoad();
    this.startPolling();
  }

  /**
   * Automatic Retry with Exponential Backoff (3 Retries)
   * Logs: Request URL, HTTP Method, Status Code, Response Body, Error Message
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    const method = (options.method || 'GET').toUpperCase();
    let delay = 500; // Exponential backoff initial delay (500ms -> 1000ms -> 2000ms)
    let lastErr = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[HTTP REQ ${attempt}/${maxRetries}] ${method} ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 6000);
        
        const fetchOptions = {
          ...options,
          signal: controller.signal
        };

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        let responseBodySnippet = '';
        try {
          const clone = response.clone();
          const text = await clone.text();
          responseBodySnippet = text.substring(0, 300);
        } catch (e) {}

        console.log(`[HTTP RES ${response.status}] ${method} ${url}`, {
          url: url,
          method: method,
          statusCode: response.status,
          responseBody: responseBodySnippet
        });

        if (response.ok) {
          return response;
        }

        lastErr = new Error(`HTTP ${response.status} - ${responseBodySnippet.substring(0, 100)}`);
      } catch (err) {
        lastErr = err;
        console.warn(`[HTTP ERR ${attempt}/${maxRetries}] ${method} ${url}:`, err.message || err);
      }

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
      }
    }

    console.error(`[HTTP FATAL] ${method} ${url} failed after ${maxRetries} retries. Reason:`, lastErr ? lastErr.message : 'Unknown network failure');
    throw lastErr || new Error(`Network failure connecting to ${url}`);
  }

  async checkHealthOnLoad() {
    console.log('[Backend Health] Executing GET /api/health check on webpage load...');
    const result = await this.checkHealth();
    if (result.success) {
      console.log('[Backend Health] Result: Backend Connected 🟢', result.data);
    } else {
      console.error('[Backend Health] Result: Failed to connect to Flask backend.', result.error);
    }
  }

  async checkHealth() {
    const candidateBases = Array.from(new Set([
      this.baseUrl,
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ])).filter(Boolean);

    let lastErrorReason = 'No server responded';

    for (const base of candidateBases) {
      const url = `${base.replace(/\/+$/, '')}/api/health`;
      try {
        const response = await this.fetchWithRetry(url, { method: 'GET', headers: { 'Accept': 'application/json' } }, 3);
        if (response.ok) {
          const data = await response.json();
          try {
            const parsedOrigin = new URL(url).origin;
            if (parsedOrigin && parsedOrigin !== 'null') {
              this.baseUrl = parsedOrigin;
              localStorage.setItem('nexus_backend_url', this.baseUrl);
            }
          } catch(e) {}

          this.isConnected = true;
          this.updateStatusBadgesUI({
            backend: data.status === 'online' || data.backend === 'running' ? 'online' : 'offline',
            camera: data.camera || 'offline',
            firebase: data.firebase || 'offline',
            cloudinary: data.cloudinary || 'offline',
            model: data.model || 'missing'
          });

          return { success: true, data };
        }
      } catch (err) {
        lastErrorReason = err.message || 'Connection refused';
      }
    }

    this.isConnected = false;
    return { success: false, error: lastErrorReason };
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    
    this.fetchStatus();

    this.pollTimer = setInterval(() => {
      this.fetchStatus();
      if (this.isConnected) {
        this.fetchLatestRecognition();
      }
    }, 2000);
  }

  async connect(url = null) {
    if (url) {
      this.baseUrl = url.replace(/\/+$/, '');
      localStorage.setItem('nexus_backend_url', this.baseUrl);
    }
    console.log(`[BackendService] Connecting to Flask Backend at ${this.baseUrl} ...`);
    await this.fetchStatus();
  }

  disconnect() {
    console.log('[BackendService] Stopping backend status polling.');
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isConnected = false;
    this.updateStatusBadgesUI({
      backend: 'offline',
      firebase: 'offline',
      cloudinary: 'offline',
      camera: 'offline',
      model: 'missing',
      fps: 0,
      accuracy: 0
    });
  }

  async fetchStatus() {
    const candidateBases = Array.from(new Set([
      this.baseUrl,
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ])).filter(Boolean);

    const urlsToTry = [];
    candidateBases.forEach(b => {
      urlsToTry.push(`${b.replace(/\/+$/, '')}/api/status`);
      urlsToTry.push(`${b.replace(/\/+$/, '')}/status`);
    });

    let success = false;

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();

          try {
            const parsedOrigin = new URL(url).origin;
            if (parsedOrigin && parsedOrigin !== 'null') {
              this.baseUrl = parsedOrigin;
              localStorage.setItem('nexus_backend_url', this.baseUrl);
            }
          } catch (e) {}

          this.isConnected = true;
          this.lastStatus = data;

          this.updateStatusBadgesUI(data);
          this.notifyStatusListeners(data);
          
          success = true;
          break;
        }
      } catch (error) {
        // Fallback candidate
      }
    }

    if (!success) {
      this.isConnected = false;
      const offlineStatus = {
        backend: 'offline',
        firebase: 'offline',
        cloudinary: 'offline',
        camera: 'offline',
        model: 'missing',
        fps: 0,
        accuracy: 0
      };
      this.lastStatus = offlineStatus;
      this.updateStatusBadgesUI(offlineStatus);
      this.notifyStatusListeners(offlineStatus);
    }

    return this.lastStatus;
  }

  updateStatusBadgesUI(data) {
    const elBackend = document.getElementById('hud-status-backend');
    const elFirebase = document.getElementById('hud-status-firebase');
    const elCloudinary = document.getElementById('hud-status-cloudinary');
    const elCamera = document.getElementById('hud-status-camera');
    const elModel = document.getElementById('hud-status-model');

    if (elBackend) {
      const isBackendOnline = data.backend === 'online';
      elBackend.className = isBackendOnline ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elBackend.innerHTML = isBackendOnline ? '🟢 Backend Online' : '🔴 Backend Offline';
    }

    if (elFirebase) {
      const isFbConnected = data.firebase === 'connected';
      elFirebase.className = isFbConnected ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elFirebase.innerHTML = isFbConnected ? '🟢 Firebase Connected' : '🔴 Firebase Offline';
    }

    if (elCloudinary) {
      const isCldConnected = data.cloudinary === 'connected' || data.cloudinary === 'online';
      elCloudinary.className = isCldConnected ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elCloudinary.innerHTML = isCldConnected ? '🟢 Cloudinary Connected' : '🔴 Cloudinary Offline';
    }

    // STRICT REQUIREMENT 1: Camera status badge comes strictly from Flask Backend API response!
    if (elCamera) {
      const isCamConnected = (data.camera === 'connected');
      elCamera.className = isCamConnected ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elCamera.innerHTML = isCamConnected ? '🟢 Camera Connected' : '🔴 Camera Offline';
    }

    if (elModel) {
      const isModelLoaded = data.model === 'loaded';
      elModel.className = isModelLoaded ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elModel.innerHTML = isModelLoaded ? '🟢 AI Model Loaded' : '🔴 AI Model Missing';
    }
  }

  async fetchLatestRecognition() {
    try {
      const res = await fetch(`${this.baseUrl}/api/recognitions/latest`);
      if (res.ok) {
        const json = await res.json();
        console.log("[API /api/recognitions/latest Response]:", json);
        this.notifyRecognitionListeners(json);
        return json;
      }
    } catch (e) {
      console.error("[API /api/recognitions/latest Error]:", e);
    }
    return null;
  }

  async getUsers() {
    const candidateBases = Array.from(new Set([this.baseUrl, 'http://127.0.0.1:5000', 'http://localhost:5000'])).filter(Boolean);
    for (const b of candidateBases) {
      const endpoints = [`${b}/api/users`, `${b}/users`];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            return json;
          }
        } catch (e) {
          console.error(`[API ${ep} Error]:`, e);
        }
      }
    }
    return null;
  }

  async getHistory() {
    const candidateBases = Array.from(new Set([this.baseUrl, 'http://127.0.0.1:5000', 'http://localhost:5000'])).filter(Boolean);
    for (const b of candidateBases) {
      const endpoints = [`${b}/api/history`, `${b}/api/recognition`, `${b}/api/recognitions`];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const json = await res.json();
            return json;
          }
        } catch (e) {
          console.error(`[API ${ep} Error]:`, e);
        }
      }
    }
    return null;
  }

  async getAnalytics() {
    const candidateBases = Array.from(new Set([this.baseUrl, 'http://127.0.0.1:5000', 'http://localhost:5000'])).filter(Boolean);
    for (const b of candidateBases) {
      try {
        const res = await fetch(`${b}/api/analytics`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.error("[API /api/analytics Error]:", e);
      }
    }
    return null;
  }

  async registerUser(userData) {
    const candidateBases = Array.from(new Set([this.baseUrl, 'http://127.0.0.1:5000', 'http://localhost:5000'])).filter(Boolean);
    const urlsToTry = [];
    candidateBases.forEach(b => {
      urlsToTry.push(`${b.replace(/\/+$/, '')}/api/register`);
      urlsToTry.push(`${b.replace(/\/+$/, '')}/register_user`);
    });

    let lastErr = 'Backend unreachable';
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        const data = await res.json().catch(() => null);
        if (data) {
          try {
            const parsedOrigin = new URL(url).origin;
            if (parsedOrigin && parsedOrigin !== 'null') {
              this.baseUrl = parsedOrigin;
              localStorage.setItem('nexus_backend_url', this.baseUrl);
            }
          } catch (e) {}
          return data;
        }
        if (!res.ok) {
          lastErr = `HTTP ${res.status} Error`;
        }
      } catch (e) {
        console.error(`[API ${url} Error]:`, e);
        lastErr = e.message || 'Connection refused';
      }
    }
    return { status: 'error', message: lastErr };
  }

  async retrainModel() {
    try {
      const res = await fetch(`${this.baseUrl}/api/train`, { method: 'POST' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("[API /api/train Error]:", e);
    }
    return { status: 'error', message: 'Backend unreachable' };
  }

  async reconnect(newUrl = null) {
    this.disconnect();
    if (newUrl) {
      this.baseUrl = newUrl.replace(/\/+$/, '');
      localStorage.setItem('nexus_backend_url', this.baseUrl);
    }
    this.startPolling();
  }

  async saveSettings(settings = {}) {
    try {
      const payload = { ...settings };
      if (payload.backend_url) {
        this.baseUrl = payload.backend_url.replace(/\/+$/, '');
        localStorage.setItem('nexus_backend_url', this.baseUrl);
      }
      const res = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('[BackendService] Settings update failed:', e);
    }
    return { status: 'error', message: 'Settings update failed' };
  }

  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
    }
  }

  onRecognitions(callback) {
    if (typeof callback === 'function') {
      this.recognitionListeners.push(callback);
    }
  }

  notifyStatusListeners(statusData) {
    this.statusListeners.forEach(fn => fn(statusData));
  }

  notifyRecognitionListeners(recognitionsData) {
    this.recognitionListeners.forEach(fn => fn(recognitionsData));
  }
}

window.backendService = new BackendService();
