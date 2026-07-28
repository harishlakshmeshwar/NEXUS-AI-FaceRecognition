/* ==========================================================================
   NEXUS-AI FIREBASE SERVICE MODULE (firebaseService.js)
   Realtime Database connection with onValue() listeners and console logging
   ========================================================================== */

class FirebaseService {
  constructor() {
    this.dbUrl = localStorage.getItem('nexus_firebase_url') || 'https://face-rec-13849-default-rtdb.asia-southeast1.firebasedatabase.app/';
    this.app = null;
    this.db = null;
    this.isConnected = false;
    this.statusListeners = [];
    this.dataListeners = {
      recognition_events: [],
      users: [],
      analytics: [],
      system: [],
      settings: []
    };
    this.refs = {};
  }

  /**
   * Connect to Firebase Realtime Database.
   */
  async connect(customDbUrl = null) {
    if (customDbUrl) {
      this.dbUrl = customDbUrl;
    }
    
    const firebaseConfig = {
      apiKey: "AIzaSyBLWgXbLYbZ9-8UP3cLkwyf9FF_9r1Bn0M",
      authDomain: "face-rec-13849.firebaseapp.com",
      databaseURL: this.dbUrl,
      projectId: "face-rec-13849",
      storageBucket: "face-rec-13849.firebasestorage.app",
      messagingSenderId: "526589798369",
      appId: "1:526589798369:web:09c55153f1df19c65ad4a0",
      measurementId: "G-Y9ELGSME6Y"
    };

    console.log("Connecting to Firebase...");

    if (window.firebase) {
      try {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(firebaseConfig);
        } else {
          this.app = firebase.app();
        }
        this.db = firebase.database();
        
        // Listen to Realtime Connection State via .info/connected
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
          this.isConnected = snap.val() === true;
          if (this.isConnected) {
            console.log("Firebase Connected");
          } else {
            console.warn("Firebase Connection Offline");
          }
          this.notifyStatusListeners(this.isConnected);
        });

        this.attachRealtimeListeners();
        return true;
      } catch (e) {
        console.error("Firebase Connection Failed", e);
      }
    } else {
      console.error("Firebase Connection Failed: SDK missing on window object.");
    }

    this.isConnected = false;
    this.notifyStatusListeners(false);
    return false;
  }

  disconnect() {
    console.log("[FirebaseService] Disconnecting listeners...");
    Object.keys(this.refs).forEach(nodePath => {
      if (this.refs[nodePath]) {
        this.refs[nodePath].off();
      }
    });
    this.refs = {};
    this.isConnected = false;
  }

  async checkStatus() {
    return this.isConnected;
  }

  async reconnect(newDbUrl = null) {
    this.disconnect();
    return await this.connect(newDbUrl);
  }

  /**
   * Attach onValue() listeners to database nodes
   */
  attachRealtimeListeners() {
    if (!this.db) return;

    // 1. recognition_events
    console.log("Loading Recognition Events...");
    this.refs['recognition_events'] = this.db.ref('recognition_events');
    this.refs['recognition_events'].on('value', (snapshot) => {
      const data = snapshot.val();
      const count = data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0;
      console.log(`Recognition Events Loaded: ${count}`);
      this.notifyDataListeners('recognition_events', data);
    }, (err) => {
      console.error("[Firebase Error] recognition_events:", err);
    });

    // 2. users
    console.log("Loading Users...");
    this.refs['users'] = this.db.ref('users');
    this.refs['users'].on('value', (snapshot) => {
      const data = snapshot.val();
      const count = data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0;
      console.log(`Users Loaded: ${count}`);
      this.notifyDataListeners('users', data);
    }, (err) => {
      console.error("[Firebase Error] users:", err);
    });

    // 3. analytics
    this.refs['analytics'] = this.db.ref('analytics');
    this.refs['analytics'].on('value', (snapshot) => {
      const data = snapshot.val();
      this.notifyDataListeners('analytics', data);
    }, (err) => {
      console.error("[Firebase Error] analytics:", err);
    });

    // 4. system
    this.refs['system'] = this.db.ref('system');
    this.refs['system'].on('value', (snapshot) => {
      const data = snapshot.val();
      this.notifyDataListeners('system', data);
    }, (err) => {
      console.error("[Firebase Error] system:", err);
    });

    // 5. settings
    this.refs['settings'] = this.db.ref('settings');
    this.refs['settings'].on('value', (snapshot) => {
      const data = snapshot.val();
      this.notifyDataListeners('settings', data);
    }, (err) => {
      console.error("[Firebase Error] settings:", err);
    });
  }

  on(nodePath, callback) {
    if (this.dataListeners[nodePath] && typeof callback === 'function') {
      this.dataListeners[nodePath].push(callback);
    }
  }

  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
    }
  }

  notifyStatusListeners(status) {
    this.statusListeners.forEach(fn => fn(status));
  }

  notifyDataListeners(nodePath, data) {
    if (this.dataListeners[nodePath]) {
      this.dataListeners[nodePath].forEach(fn => fn(data));
    }
  }
}

// Global Singleton Instance
window.firebaseService = new FirebaseService();
