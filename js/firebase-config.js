/* ==========================================================================
   NEXUS-AI FIREBASE INTEGRATION & REALTIME SYNC CONTROLLER
   Pure Live Firebase Realtime Database Listener (face-rec-13849)
   ========================================================================== */

class FirebaseSyncController {
  constructor() {
    this.isLiveFirebase = false;
    this.db = null;

    // User's Live Firebase project configuration
    this.config = {
      apiKey: "AIzaSyBLWgXbLYbZ9-8UP3cLkwyf9FF_9r1Bn0M",
      authDomain: "face-rec-13849.firebaseapp.com",
      databaseURL: "https://face-rec-13849-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "face-rec-13849",
      storageBucket: "face-rec-13849.firebasestorage.app",
      messagingSenderId: "526589798369",
      appId: "1:526589798369:web:09c55153f1df19c65ad4a0",
      measurementId: "G-Y9ELGSME6Y"
    };

    // Listeners array
    this.eventListeners = [];
    
    // Initialize
    this.initFirebase();
  }

  initFirebase() {
    // Check if user saved custom override in localStorage
    const savedConfig = localStorage.getItem('nexus_firebase_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      } catch (e) {
        console.warn('[Firebase] Invalid saved config');
      }
    }

    if (window.firebase) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.config);
        }
        this.db = firebase.database();
        this.isLiveFirebase = true;
        console.log('[Firebase] Successfully connected to live Firebase Database:', this.config.databaseURL);
        this.setupRealtimeListeners();
      } catch (e) {
        console.warn('[Firebase] Connection failed:', e);
      }
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('nexus_firebase_config', JSON.stringify(this.config));
    location.reload();
  }

  onRecognitionEvent(callback) {
    if (typeof callback === 'function') {
      this.eventListeners.push(callback);
    }
  }

  notifyListeners(eventData) {
    this.eventListeners.forEach(cb => cb(eventData));
  }

  setupRealtimeListeners() {
    if (!this.db) return;

    // Direct Realtime listener on 'recognition_events'
    const eventsRef = this.db.ref('recognition_events');
    eventsRef.limitToLast(1).on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.notifyListeners(data);
      }
    });
  }

  pushEvent(eventData) {
    if (this.isLiveFirebase && this.db) {
      this.db.ref('recognition_events').push(eventData);
    }
  }
}

window.firebaseSync = new FirebaseSyncController();
