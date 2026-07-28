/* ==========================================================================
   NEXUS-AI MAIN APPLICATION CONTROLLER
   Strict Real-Only Production Telemetry Engine
   ========================================================================== */

class NexusApp {
  constructor() {
    this.activeTab = 'dashboard';
    this.isSimulating = false; // DEMO MODE PERMANENTLY DISABLED
    this.registeredUsers = [];
    this.recognitionEvents = [];
    this.isCameraConnected = false;
    this.isModelLoaded = false;
    
    this.defaults = {
      backendUrl: 'http://127.0.0.1:5000',
      firebaseUrl: 'https://face-rec-13849-default-rtdb.asia-southeast1.firebasedatabase.app/',
      ipWebcamUrl: '0'
    };

    this.initIntroScreen();
    this.initApp();
  }

  initIntroScreen() {
    // 1. Initialize 3D Intro Particle Face Head
    if (window.initIntroParticleFaceHead) {
      window.initIntroParticleFaceHead('intro-canvas-container');
    }

    // 2. Typewriter Animation Loop
    const words = ['Detect', 'Learn', 'Recognize', 'Secure'];
    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    const typingEl = document.getElementById('typing-text');

    const typeLoop = () => {
      if (!typingEl) return;
      const currentWord = words[wordIdx];

      if (isDeleting) {
        typingEl.textContent = currentWord.substring(0, charIdx - 1);
        charIdx--;
      } else {
        typingEl.textContent = currentWord.substring(0, charIdx + 1);
        charIdx++;
      }

      let speed = isDeleting ? 60 : 120;

      if (!isDeleting && charIdx === currentWord.length) {
        speed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        speed = 500;
      }

      setTimeout(typeLoop, speed);
    };
    typeLoop();

    // 3. AI Pipeline Stepper Animation
    let stepIdx = 1;
    setInterval(() => {
      document.querySelectorAll('.stepper-node').forEach(node => node.classList.remove('active'));
      const activeNode = document.getElementById(`step-node-${stepIdx}`);
      if (activeNode) activeNode.classList.add('active');
      stepIdx = (stepIdx % 5) + 1;
    }, 1800);

    // 4. CTA Launch Dashboard Click
    const launchBtn = document.getElementById('btn-launch-dashboard');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => {
        const introScreen = document.getElementById('landing-intro-screen');
        if (introScreen) {
          introScreen.classList.add('hidden');
        }
      });
    }
  }

  async initApp() {
    this.loadSavedSettings();
    this.bindTabNavigation();
    this.startSystemClock();
    this.initThreeJSBackgrounds();
    this.initCharts();

    this.isStreamRunning = false;
    this.resetTelemetryHUD('CAMERA OFFLINE', 'Waiting for Camera...');
    this.renderRegisteredUsers();
    this.renderRecognitionHistory([]);
    
    await this.initServices();

    this.bindRegisterModal();
    this.bindSettingsForm();
    this.bindStreamToggle();

    console.log('[Nexus App] Real-Only production telemetry initialized.');
  }

  resetTelemetryHUD(title = 'NO FACE DETECTED', subtitle = 'Waiting for Stream...') {
    const nameEl = document.getElementById('hud-target-name');
    const roleEl = document.getElementById('hud-target-role');
    const confEl = document.getElementById('hud-target-conf');
    const barInner = document.getElementById('hud-conf-bar-inner');
    const timeEl = document.getElementById('hud-target-time');

    if (nameEl) nameEl.textContent = title;
    if (roleEl) roleEl.textContent = subtitle;
    if (confEl) confEl.textContent = '0.0%';
    if (barInner) barInner.style.width = '0%';
    if (timeEl) timeEl.textContent = '--:--:--';
  }

  loadSavedSettings() {
    this.backendUrl = localStorage.getItem('nexus_backend_url') || this.defaults.backendUrl;
    this.firebaseUrl = localStorage.getItem('nexus_firebase_url') || this.defaults.firebaseUrl;
    this.ipWebcamUrl = localStorage.getItem('nexus_ipwebcam_url') || this.defaults.ipWebcamUrl;

    const backendInput = document.getElementById('setting-backend-url');
    const firebaseInput = document.getElementById('setting-firebase-url');
    const cameraInput = document.getElementById('setting-ipwebcam-url');
    const thresholdInput = document.querySelector('.cyber-range');

    if (backendInput) backendInput.value = this.backendUrl;
    if (firebaseInput) firebaseInput.value = this.firebaseUrl;
    if (cameraInput) cameraInput.value = this.ipWebcamUrl;
    if (thresholdInput) {
      const savedThreshold = Number(localStorage.getItem('nexus_recognition_threshold') || '90');
      thresholdInput.value = String(savedThreshold);
    }

    this.updateBackendUrlIndicator();
  }

  async initServices() {
    // 1. Backend Service & Polling Status / Recognitions
    if (window.backendService) {
      window.backendService.onStatusChange((status) => this.handleBackendStatusUpdate(status));
      window.backendService.onRecognitions((recsData) => this.handleBackendRecognitionsUpdate(recsData));
      await window.backendService.connect(this.backendUrl);

      const res = await window.backendService.getUsers();
      if (res && res.users) {
        this.registeredUsers = Array.isArray(res.users) ? res.users : Object.values(res.users);
        this.renderRegisteredUsers();
      }

      await this.loadAnalyticsDashboard();
    }

    // 2. Firebase Service & Listeners
    if (window.firebaseService) {
      window.firebaseService.onStatusChange((fbConnected) => {
        const elFirebase = document.getElementById('hud-status-firebase');
        if (elFirebase) {
          elFirebase.className = fbConnected ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
          elFirebase.innerHTML = fbConnected ? '🟢 Firebase Connected' : '🔴 Firebase Connection Failed';
        }
      });

      await window.firebaseService.connect(this.firebaseUrl);
      
      window.firebaseService.on('users', (usersData) => {
        if (usersData) {
          let userList = [];
          if (typeof usersData === 'object') {
            Object.keys(usersData).forEach(key => {
              const u = usersData[key];
              userList.push({
                id: u.id || key,
                name: u.name || 'Registered Subject',
                role: u.role || 'Subject',
                clearance: u.clearance || 'Level 1',
                status: u.status || 'Active',
                cloudinary_url: u.cloudinary_url || u.image_url || u.image || u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                cloudinary_public_id: u.cloudinary_public_id || '',
                created_at: u.created_at || u.createdAt || '2026-07-22'
              });
            });
          } else if (Array.isArray(usersData)) {
            userList = usersData;
          }
          this.registeredUsers = userList;
          this.renderRegisteredUsers();
        } else {
          this.registeredUsers = [];
          this.renderRegisteredUsers();
        }
      });

      window.firebaseService.on('recognition_events', (eventsData) => {
        this.handleFirebaseEventsUpdate(eventsData);
      });

      window.firebaseService.on('analytics', (analyticsData) => {
        if (analyticsData && window.cyberCharts) {
          window.cyberCharts.updateAnalyticsNode(analyticsData);
        }
      });
    }

    // 3. Connect Camera Service
    if (window.cameraService) {
      window.cameraService.onStatusChange((status) => this.handleCameraStatusUpdate(status));
      if (this.isStreamRunning) {
        window.cameraService.connect(this.backendUrl, 'live-stream-img', true);
      }
    }
  }

  bindStreamToggle() {
    const toggleBtn = document.getElementById('btn-toggle-stream');
    const modeBadge = document.getElementById('live-stream-mode');
    if (!toggleBtn || !modeBadge) return;

    toggleBtn.addEventListener('click', async () => {
      this.isStreamRunning = !this.isStreamRunning;
      const isStarting = this.isStreamRunning;

      toggleBtn.textContent = isStarting ? 'Stop Live Recognition' : 'Start Live Recognition';
      modeBadge.textContent = isStarting ? 'STREAM ACTIVE' : 'STREAM PAUSED';
      modeBadge.className = isStarting ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';

      if (isStarting) {
        if (window.backendService) {
          window.backendService.startPolling();
          await window.backendService.fetchStatus();
        }
        if (window.cameraService) {
          window.cameraService.connect(this.ipWebcamUrl, 'live-stream-img');
        }
      } else {
        if (window.cameraService) {
          window.cameraService.disconnect();
        }
      }
    });
  }

  handleBackendStatusUpdate(status) {
    const elBackend = document.getElementById('hud-status-backend');
    const elFirebase = document.getElementById('hud-status-firebase');
    const elCloudinary = document.getElementById('hud-status-cloudinary');
    const elCamera = document.getElementById('hud-status-camera');
    const elModel = document.getElementById('hud-status-model');

    const isOnline = status.backend === 'online';
    this.isCameraConnected = (status.camera === 'connected');
    this.isModelLoaded = (status.model === 'loaded');

    if (elBackend) {
      elBackend.className = isOnline ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elBackend.innerHTML = isOnline ? '🟢 Backend Online' : '🔴 Backend Offline';
    }

    if (elFirebase) {
      const fbConn = status.firebase === 'connected' || (window.firebaseService && window.firebaseService.isConnected);
      elFirebase.className = fbConn ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elFirebase.innerHTML = fbConn ? '🟢 Firebase Connected' : '🔴 Firebase Connection Failed';
    }

    if (elCloudinary) {
      const cldConn = status.cloudinary === 'connected' || status.cloudinary === 'online';
      elCloudinary.className = cldConn ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elCloudinary.innerHTML = cldConn ? '🟢 Cloudinary Connected' : '🔴 Cloudinary Offline';
    }

    if (elCamera) {
      elCamera.className = this.isCameraConnected ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elCamera.innerHTML = this.isCameraConnected ? '🟢 Camera Connected' : '🔴 Camera Offline';
    }

    if (elModel) {
      elModel.className = this.isModelLoaded ? 'status-badge status-badge-online' : 'status-badge status-badge-offline';
      elModel.innerHTML = this.isModelLoaded ? '🟢 AI Model Loaded' : '🔴 AI Model Missing';
    }

    // Handle Telemetry Status
    if (!this.isCameraConnected) {
      this.resetTelemetryHUD('CAMERA OFFLINE', 'No Face Detected \u2022 Waiting for Camera');
    } else if (!this.isModelLoaded) {
      this.resetTelemetryHUD('AI MODEL MISSING', 'Recognition Disabled');
    }
  }

  handleCameraStatusUpdate(statusStr) {
    const isConn = (statusStr === 'connected') && this.isCameraConnected;
    if (!isConn) {
      this.resetTelemetryHUD('CAMERA OFFLINE', 'No Face Detected \u2022 Waiting for Camera');
    }
  }

  handleFirebaseEventsUpdate(eventsData) {
    if (!this.isCameraConnected || !this.isModelLoaded || !eventsData) {
      this.renderEmptyRecognitionHistory();
      return;
    }

    let eventList = [];
    if (typeof eventsData === 'object') {
      eventList = Object.values(eventsData);
    } else if (Array.isArray(eventsData)) {
      eventList = eventsData;
    }

    if (eventList.length === 0) {
      this.renderEmptyRecognitionHistory();
      return;
    }

    const latestEvent = eventList[eventList.length - 1];
    
    // Ignore events older than 15 seconds
    const eventTime = latestEvent.time_sec || (new Date(latestEvent.timestamp).getTime() / 1000);
    const nowSec = Date.now() / 1000;
    if (nowSec - eventTime < 15) {
      this.handleNewRecognitionEvent(latestEvent);
      this.renderRecognitionHistory(eventList);
    } else {
      this.resetTelemetryHUD('NO FACE DETECTED', 'Waiting for Stream...');
    }
  }

  resetTelemetryHUD(mainStatus, subStatus) {
    const nameEl = document.getElementById('hud-target-name');
    if (nameEl) nameEl.textContent = mainStatus || 'AWAITING';

    const roleEl = document.getElementById('hud-target-role');
    if (roleEl) roleEl.textContent = subStatus || '--';

    const idEl = document.getElementById('hud-target-id');
    if (idEl) idEl.textContent = '--';

    const confEl = document.getElementById('hud-target-conf');
    if (confEl) confEl.textContent = '0.0%';

    const barInner = document.getElementById('hud-conf-bar-inner');
    if (barInner) barInner.style.width = '0%';

    const statusEl = document.getElementById('hud-target-status');
    if (statusEl) {
      if (mainStatus === 'CAMERA OFFLINE') {
        statusEl.textContent = 'OFFLINE';
        statusEl.style.color = 'var(--cyber-red)';
        statusEl.style.borderColor = 'var(--cyber-red)';
      } else if (mainStatus === 'AI MODEL MISSING') {
        statusEl.textContent = 'DISABLED';
        statusEl.style.color = 'var(--cyber-amber)';
        statusEl.style.borderColor = 'var(--cyber-amber)';
      } else {
        statusEl.textContent = 'WAITING';
        statusEl.style.color = 'var(--text-muted)';
        statusEl.style.borderColor = 'var(--border-glass)';
      }
    }
  }

  handleBackendRecognitionsUpdate(data) {
    if (!data) return;

    if (data.status === 'camera_offline' || !this.isCameraConnected) {
      this.resetTelemetryHUD('CAMERA OFFLINE', 'No Face Detected \u2022 Waiting for Camera');
      return;
    }

    if (data.status === 'model_missing' || !this.isModelLoaded) {
      this.resetTelemetryHUD('AI MODEL MISSING', 'Recognition Disabled');
      return;
    }

    if (data.status === 'no_face_detected') {
      this.resetTelemetryHUD('NO FACE DETECTED', 'Waiting for Stream...');
      return;
    }

    if (data.status === 'success' && data.event) {
      this.handleNewRecognitionEvent(data.event);
    }
  }

  handleNewRecognitionEvent(event) {
    if (!event) return;

    this.isCameraConnected = true;
    this.isModelLoaded = true;

    const isUnknown = !event.name || event.name.toUpperCase().includes('UNKNOWN');

    const nameEl = document.getElementById('hud-target-name');
    if (nameEl) {
      nameEl.textContent = (event.name || 'UNKNOWN PERSON').toUpperCase();
    }

    const roleEl = document.getElementById('hud-target-role');
    if (roleEl) {
      const role = event.user_info ? event.user_info.role : (isUnknown ? 'Unregistered Subject' : 'Recognized Target');
      const clearance = event.user_info ? event.user_info.clearance : (isUnknown ? 'Level 0' : 'Level 1');
      roleEl.textContent = `${role} \u2022 ${clearance}`;
    }

    const idEl = document.getElementById('hud-target-id');
    if (idEl) {
      idEl.textContent = event.user_id || (event.user_info ? event.user_info.id : '--');
    }

    const confEl = document.getElementById('hud-target-conf');
    const barInner = document.getElementById('hud-conf-bar-inner');
    const confVal = event.confidence !== undefined ? event.confidence : 0;
    
    if (confEl) confEl.textContent = `${confVal}%`;
    if (barInner) barInner.style.width = `${confVal}%`;

    const statusEl = document.getElementById('hud-target-status');
    if (statusEl) {
      if (isUnknown) {
        statusEl.textContent = 'UNKNOWN';
        statusEl.style.color = 'var(--cyber-red)';
        statusEl.style.borderColor = 'var(--cyber-red)';
      } else {
        statusEl.textContent = 'RECOGNIZED';
        statusEl.style.color = '#0f0';
        statusEl.style.borderColor = '#0f0';
      }
    }

    const timeEl = document.getElementById('hud-target-time');
    if (timeEl) {
      timeEl.textContent = event.timestamp || new Date().toLocaleTimeString();
    }

    if (this.hologramVisualizer) {
      this.hologramVisualizer.triggerPulse();
    }

    if (window.cyberCharts) {
      window.cyberCharts.pushRealtimeEvent(event.name, confVal, event.latency || 14);
    }
  }

  renderEmptyRecognitionHistory() {
    const feedList = document.getElementById('live-feed-list');
    if (feedList) {
      feedList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px;">No recognition events found.</div>`;
    }

    const tableBody = document.getElementById('logs-table-body');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No recognition events found.</td></tr>`;
    }
  }

  renderRecognitionHistory(eventList) {
    if (!eventList || eventList.length === 0) {
      this.renderEmptyRecognitionHistory();
      return;
    }

    const feedList = document.getElementById('live-feed-list');
    if (feedList) {
      feedList.innerHTML = '';
      const recentFeed = eventList.slice(-6).reverse();
      recentFeed.forEach(event => {
        const isAlert = (event.confidence || 0) < 50 || (event.name && event.name.toUpperCase().includes("UNKNOWN"));
        const userProf = event.user_info || (this.registeredUsers ? this.registeredUsers.find(u => u.name && event.name && u.name.toLowerCase() === event.name.toLowerCase()) : null);
        const imgUrl = (userProf && (userProf.cloudinary_url || userProf.image_url)) || event.cloudinary_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
        
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '12px';
        item.style.padding = '10px 14px';
        item.style.background = 'rgba(255, 255, 255, 0.03)';
        item.style.border = '1px solid rgba(255, 255, 255, 0.06)';
        item.style.borderRadius = '12px';

        item.innerHTML = `
          <img src="${imgUrl}" style="width:36px; height:36px; border-radius:10px; border:1px solid ${isAlert ? 'var(--cyber-red)' : 'var(--cyber-cyan)'}; object-fit:cover;">
          <div style="flex:1;">
            <div style="font-family:var(--font-hud); font-size:0.85rem; color:#fff; display:flex; justify-content:space-between;">
              <span>${(event.name || 'UNKNOWN').toUpperCase()}</span>
              <span style="color:${isAlert ? 'var(--cyber-red)' : 'var(--cyber-cyan)'}">${event.confidence || 0}%</span>
            </div>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">
              ${event.timestamp || new Date().toLocaleTimeString()} &bull; ${isAlert ? 'Access Denied' : 'Access Granted'}
            </div>
          </div>
        `;
        feedList.appendChild(item);
      });
    }

    const tableBody = document.getElementById('logs-table-body');
    if (tableBody) {
      tableBody.innerHTML = '';
      const recentLogs = eventList.slice(-20).reverse();
      recentLogs.forEach(event => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(0, 243, 255, 0.08)';
        const userProf = event.user_info || (this.registeredUsers ? this.registeredUsers.find(u => u.name && event.name && u.name.toLowerCase() === event.name.toLowerCase()) : null);
        const imgUrl = (userProf && (userProf.cloudinary_url || userProf.image_url)) || event.cloudinary_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
        const clearanceStr = (userProf && userProf.clearance) ? userProf.clearance : 'Level 5 - Admin';

        tr.innerHTML = `
          <td style="padding: 12px; font-family: var(--font-hud); font-size:0.85rem;">${event.eventId || event.id || '#' + Math.floor(1000 + Math.random()*9000)}</td>
          <td style="padding: 12px;">${event.timestamp || new Date().toLocaleTimeString()}</td>
          <td style="padding: 12px; font-weight: 600; color: #fff;">${(event.name || 'Unknown').toUpperCase()}</td>
          <td style="padding: 12px;"><span class="status-badge ${(event.confidence || 0) > 70 ? 'status-badge-online' : 'status-badge-warning'}">${event.confidence || 0}%</span></td>
          <td style="padding: 12px;">${clearanceStr}</td>
          <td style="padding: 12px;">
            <a href="${imgUrl}" target="_blank" style="color: var(--cyber-cyan); text-decoration: none; display: flex; align-items: center; gap: 8px;">
              <img src="${imgUrl}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover; border: 1px solid var(--cyber-cyan);">
              <span style="font-size: 0.75rem;">View Cloudinary</span>
            </a>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  renderRegisteredUsers() {
    const grid = document.getElementById('users-grid-container');
    if (!grid) return;

    grid.innerHTML = '';
    const users = this.registeredUsers;

    if (!users || users.length === 0) {
      this.renderEmptyUsers();
      return;
    }

    users.forEach((u, idx) => {
      const card = document.createElement('div');
      card.className = 'glass-panel';
      card.style.borderRadius = '18px';
      card.style.padding = '20px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'center';
      card.style.textAlign = 'center';
      card.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      card.style.background = 'rgba(255, 255, 255, 0.03)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.08)';

      const userImg = u.cloudinary_url || u.image_url || u.image || u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      card.innerHTML = `
        <div style="position:relative; margin-bottom:12px;">
          <img src="${userImg}" style="width:72px; height:72px; border-radius:50%; border:2px solid var(--cyber-cyan); object-fit:cover; box-shadow:0 0 15px var(--cyber-cyan-glow);">
          <div style="position:absolute; bottom:2px; right:2px; width:12px; height:12px; border-radius:50%; background:#10b981; border:2px solid #000;"></div>
        </div>
        <h4 style="font-family: var(--font-hud); font-size: 1.05rem; color: #fff; margin:0;">${u.name || 'Subject'}</h4>
        <div style="font-size: 0.8rem; color: var(--cyber-cyan); margin-top:2px;">${u.role || 'Registered Subject'}</div>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">ID: #${u.id || (idx+1)} &bull; ${u.clearance || 'Level 1'}</div>
        
        <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center; width:100%; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
          <button onclick="window.nexusApp.deleteUser('${u.id}')" style="background:rgba(244, 63, 94, 0.1); border:1px solid rgba(244, 63, 94, 0.3); color:var(--cyber-red); padding:6px 12px; border-radius:10px; cursor:pointer; font-size:0.75rem; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s;">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  async deleteUser(userId) {
    if (!confirm(`Are you sure you want to delete Subject #${userId}? This will remove the Cloudinary image, Firebase record, and local dataset.`)) {
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/users/${userId}`, { method: 'DELETE' });
      const jsonRes = await res.json();

      if (window.firebaseService && window.firebaseService.db) {
        await window.firebaseService.db.ref(`users/${userId}`).remove();
      }

      this.registeredUsers = this.registeredUsers.filter(u => String(u.id) !== String(userId));
      this.renderRegisteredUsers();

      this.showToast(`Subject #${userId} deleted from Cloudinary & Firebase!`);
    } catch(err) {
      console.error('[Delete User Error]:', err);
      this.showToast(`Failed to delete user: ${err.message}`);
    }
  }

  renderEmptyUsers() {
    const grid = document.getElementById('users-grid-container');
    if (!grid) return;

    grid.innerHTML = `
      <div style="grid-column: 1 / -1; color: var(--text-muted); text-align: center; padding: 40px;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 10px; color: var(--cyber-cyan);"></i>
        <div>No registered subjects found.</div>
      </div>
    `;
  }

  bindTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (!tabId) return;

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });

        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) {
          targetTab.classList.add('active');
          this.activeTab = tabId;
          if (tabId === 'analytics' || tabId === 'dashboard') {
            setTimeout(() => {
              if (window.cyberCharts) {
                window.cyberCharts.resizeAndRefresh();
              }
              this.loadAnalyticsDashboard();
            }, 60);
          }
        }
      });
    });
  }

  async loadAnalyticsDashboard() {
    if (window.cyberCharts) {
      window.cyberCharts.resizeAndRefresh();
    }
    if (!window.backendService) return;
    try {
      const analytics = await window.backendService.getAnalytics();
      const history = await window.backendService.getHistory();
      const historyData = history && history.data ? history.data : [];

      if (analytics && window.cyberCharts) {
        window.cyberCharts.loadAnalyticsData(analytics, historyData);
      }
    } catch (err) {
      console.error('[Analytics Load Error]:', err);
    }
  }

  startSystemClock() {
    const clockEl = document.getElementById('hud-system-time');
    const update = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toTimeString().split(' ')[0] + ' UTC';
      }
    };
    update();
    setInterval(update, 1000);
  }

  initThreeJSBackgrounds() {
    if (window.initNeuralBackground) {
      window.initNeuralBackground('bg-canvas-container');
    }
    if (window.initHologramVisualizer) {
      this.hologramVisualizer = window.initHologramVisualizer('hologram-canvas');
    }
  }

  initCharts() {
    if (window.cyberCharts) {
      window.cyberCharts.initAllCharts();
    }
  }

  bindRegisterModal() {
    const openBtn = document.getElementById('btn-open-register-modal');
    const modal = document.getElementById('register-modal');
    const closeBtn = document.getElementById('btn-close-modal');
    const form = document.getElementById('register-user-form');
    const snapBtn = document.getElementById('btn-snap-register');
    const fileInput = document.getElementById('reg-file-input');

    const defaultSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23081020'/><circle cx='50' cy='40' r='18' fill='%2300f3ff' opacity='0.3'/><path d='M 20 85 Q 50 55 80 85 Z' fill='%2300f3ff' opacity='0.3'/></svg>";

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        const previewImg = document.getElementById('register-preview-img');
        const hint = document.getElementById('snap-status-hint');
        if (previewImg) {
          previewImg.src = defaultSvg;
          previewImg.style.border = '2px dashed var(--cyber-cyan)';
          previewImg.style.boxShadow = 'none';
        }
        if (hint) {
          hint.innerHTML = '<i class="fa-solid fa-circle-info"></i> Take live camera snapshot or upload image from drive';
          hint.style.color = 'var(--cyber-cyan)';
        }
        if (fileInput) fileInput.value = '';
      });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    // 1. File Upload / Select Photo Handler
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const previewImg = document.getElementById('register-preview-img');
            const hint = document.getElementById('snap-status-hint');
            if (previewImg) {
              previewImg.src = evt.target.result;
              previewImg.style.border = '2px solid var(--cyber-cyan)';
              previewImg.style.boxShadow = '0 0 12px rgba(0, 243, 255, 0.4)';
            }
            if (hint) {
              hint.innerHTML = `🟢 Selected File: <strong>${file.name}</strong>`;
              hint.style.color = 'var(--cyber-green)';
            }
            this.showToast(`Loaded face photo: ${file.name}`);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // 2. Capture Live Snapshot Handler
    if (snapBtn) {
      snapBtn.addEventListener('click', async () => {
        this.showToast('Capturing live face snapshot...');
        let snapshotB64 = null;
        if (window.recognitionStream) {
          if (window.recognitionStream.captureSnapshotAsync) {
            snapshotB64 = await window.recognitionStream.captureSnapshotAsync();
          } else {
            snapshotB64 = window.recognitionStream.captureSnapshot();
          }
        }

        const previewImg = document.getElementById('register-preview-img');
        const hint = document.getElementById('snap-status-hint');

        if (snapshotB64 && snapshotB64.startsWith('data:image')) {
          if (previewImg) {
            previewImg.src = snapshotB64;
            previewImg.style.border = '2px solid var(--cyber-cyan)';
            previewImg.style.boxShadow = '0 0 12px rgba(0, 243, 255, 0.4)';
          }
          if (hint) {
            hint.innerHTML = '🟢 Live Snapshot Captured!';
            hint.style.color = 'var(--cyber-green)';
          }
          this.showToast('Live face snapshot captured successfully!');
        } else {
          this.showToast('Unable to capture webcam frame. Please click "Select Photo File" to choose an image from your computer.');
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const inputId = document.getElementById('reg-id') ? document.getElementById('reg-id').value : '';
        const userId = inputId.trim() !== '' ? inputId.trim() : `USR-${Math.floor(1000 + Math.random()*9000)}`;
        const role = document.getElementById('reg-role').value;
        const clearance = document.getElementById('reg-clearance').value;
        const previewImg = document.getElementById('register-preview-img');
        const b64Image = previewImg ? previewImg.src : null;

        if (!b64Image || (!b64Image.startsWith('data:image/jpeg') && !b64Image.startsWith('data:image/png') && !b64Image.startsWith('data:image/webp'))) {
          this.showToast('⚠️ Please capture a live snapshot or select a photo file first!');
          return;
        }

        this.showToast('Processing face registration & training AI model...');

        const userData = {
          name: name,
          id: userId,
          role: role,
          clearance: clearance,
          images: [b64Image]
        };

        const res = await window.backendService.registerUser(userData);
        
        if (!res || res.status === 'error') {
          const errorMsg = res ? res.message : 'Registration failed.';
          this.showToast(`Error: ${errorMsg}`);
          return;
        }

        const serverReturnedUser = res.user || {};
        const cldUrl = serverReturnedUser.cloudinary_url || (b64Image.length < 500 ? b64Image : null);
        const cldPublicId = serverReturnedUser.cloudinary_public_id || null;
        const createdAtStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

        if (window.firebaseService && window.firebaseService.db) {
          try {
            await window.firebaseService.db.ref(`users/${userId}`).set({
              id: userId,
              name: name,
              role: role,
              clearance: clearance,
              cloudinary_url: cldUrl,
              cloudinary_public_id: cldPublicId,
              created_at: createdAtStr,
              status: 'Active'
            });
          } catch(err) {
            console.error('[Firebase User Save Error]:', err);
          }
        }

        const newObj = {
          id: userId,
          name: name,
          role: role,
          clearance: clearance,
          status: 'Active',
          cloudinary_url: cldUrl,
          cloudinary_public_id: cldPublicId,
          created_at: createdAtStr
        };
        
        const existingIdx = this.registeredUsers.findIndex(u => String(u.id) === String(userId));
        if (existingIdx >= 0) {
          this.registeredUsers[existingIdx] = newObj;
        } else {
          this.registeredUsers.push(newObj);
        }

        this.renderRegisteredUsers();
        if (modal) modal.classList.remove('active');

        this.showToast(`[Success] Subject "${name}" (ID: ${userId}) registered & AI model updated!`);
        form.reset();
      });
    }
  }

  bindSettingsForm() {
    const btnSave = document.getElementById('btn-save-settings');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const backendUrl = document.getElementById('setting-backend-url').value;
        const firebaseUrl = document.getElementById('setting-firebase-url').value;
        const cameraUrl = document.getElementById('setting-ipwebcam-url').value;
        const thresholdInput = document.querySelector('.cyber-range');
        const threshold = thresholdInput ? Number(thresholdInput.value) : Number(localStorage.getItem('nexus_recognition_threshold') || '90');

        if (backendUrl) localStorage.setItem('nexus_backend_url', backendUrl);
        if (firebaseUrl) localStorage.setItem('nexus_firebase_url', firebaseUrl);
        if (cameraUrl) localStorage.setItem('nexus_ipwebcam_url', cameraUrl);
        localStorage.setItem('nexus_recognition_threshold', String(threshold));

        this.backendUrl = backendUrl || this.backendUrl;
        this.firebaseUrl = firebaseUrl || this.firebaseUrl;
        this.ipWebcamUrl = cameraUrl || this.ipWebcamUrl;
        this.updateBackendUrlIndicator();

        if (window.backendService) {
          await window.backendService.saveSettings({
            backend_url: backendUrl,
            firebase_url: firebaseUrl,
            camera_url: cameraUrl,
            recognition_threshold: threshold
          });
          await window.backendService.reconnect(backendUrl);
        }
        if (window.firebaseService) await window.firebaseService.reconnect(firebaseUrl);
        if (window.cameraService) await window.cameraService.reconnect(cameraUrl);

        this.showToast('System configuration saved & services reconnected!');
      });
    }
  }

  updateBackendUrlIndicator() {
    const urlEl = document.getElementById('hud-backend-url');
    if (urlEl) {
      urlEl.textContent = `Backend URL: ${this.backendUrl}`;
    }
  }

  showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'glass-panel';
    toast.style.cssText = 'padding: 12px 20px; border-color: var(--cyber-cyan); color: #fff; font-family: var(--font-heading); box-shadow: 0 0 15px var(--cyber-cyan-glow); margin-top: 10px; font-weight: 600;';
    toast.innerHTML = `<span class="glow-cyan">NEXUS SYSTEM:</span> ${msg}`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.nexusApp = new NexusApp();
});
