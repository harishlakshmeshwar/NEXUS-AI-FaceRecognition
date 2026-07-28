# NEXUS-AI: Premium Futuristic AI Face Recognition System

[![Python](https://img.shields.io/badge/Python-3.9+-00f3ff.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-REST_API-8a2be2.svg)](https://flask.palletsprojects.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Face_Detection-00ff9d.svg)](https://opencv.org/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Hologram-ff0055.svg)](https://threejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_Sync-ffb700.svg)](https://firebase.google.com/)

An production-grade, futuristic AI Face Recognition Web Application built with **HTML5, Vanilla CSS3 (Dark Cyberpunk Glassmorphism), JavaScript, Three.js, Chart.js, Firebase Realtime Sync**, and a **Python Flask ML backend** powered by **OpenCV detection, PCA (Eigenfaces) feature extraction, and Artificial Neural Network (ANN) classification**.

---

## Key Features

1. **Cyberpunk Glassmorphism Interface**:
   - Dark Cyber-Blue theme (`#060913`) with glowing cyan (`#00f3ff`) and electric purple (`#8a2be2`) accents.
   - Dynamic background cyber grid pattern and interactive HUD scanline effects.
   - Single Page Application (SPA) layout with smooth tab transitions (*Command Center, Identity Database, AI Analytics, Audit Logs, Settings*).

2. **3D Three.js Visualizations**:
   - **3D Biometric Face Hologram**: Rotating 3D human face wireframe and point-cloud mesh with orbital scan rings and sync pulse animations triggered during detection.
   - **3D Neural Network Background**: Dynamic particle canvas with active synaptic connections connecting floating neurons.

3. **Machine Learning Pipeline (OpenCV + PCA + ANN)**:
   - **Face Detection**: OpenCV `CascadeClassifier` for frontal face detection with histogram equalization.
   - **PCA Dimensionality Reduction**: Projects 10,000-pixel face image matrices ($100 \times 100$) into $k=50$ principal components (Eigenface vectors).
   - **ANN Neural Classifier**: Multi-Layer Perceptron (`sklearn.neural_network.MLPClassifier`) with ReLU activation and Adam optimizer for predicting subject identities with probability confidence scores.

4. **Real-time Analytics & Firebase Sync**:
   - Real-time **Chart.js** charts tracking confidence score trends, user frequency distributions, PCA variance ratios, and pipeline FPS/latency.
   - Live synchronization with **Firebase Realtime Database & Storage** (with an out-of-the-box **Simulator Mode fallback** for offline demonstration).

---

## Directory Architecture

```
FACE REC/
├── backend/
│   ├── app.py                  # Flask REST API & Streaming Server
│   ├── ml_pipeline.py          # OpenCV detection, PCA extraction, ANN classification
│   ├── train.py                # Model training & synthetic dataset generator script
│   ├── firebase_sync.py        # Firebase Realtime DB & Storage integration module
│   └── requirements.txt        # Python dependencies
├── web/
│   └── index.html              # Main Cyberpunk Dashboard SPA UI
├── css/
│   ├── cyber-theme.css         # Color palette, neon glow effects, typography
│   ├── glassmorphism.css       # Glass cards, frosted blurs, glowing modals, sliders
│   └── layout.css              # App layout, grid systems, tab viewports, responsive styles
├── js/
│   ├── app.js                  # Main app controller, tab navigation, notifications
│   ├── firebase-config.js      # Firebase SDK initialization & simulation fallback
│   ├── recognition.js          # Live stream processor, local webcam & snapshot capture
│   └── charts.js               # Interactive Chart.js dashboard initialization
├── threejs/
│   ├── face-hologram.js        # 3D holographic human head visualizer
│   └── neural-bg.js            # 3D neural network background particles
├── firebase/
│   ├── database-rules.json     # Firebase Realtime DB security rules
│   └── storage-rules.json      # Firebase Storage security rules
├── models/
│   ├── pca_model.pkl           # Trained PCA Eigenfaces transformer model
│   ├── ann_model.pkl           # Trained Artificial Neural Network classifier
│   └── label_map.json          # Mapping of user IDs to subject metadata
└── README.md                   # Comprehensive documentation
```

---

## Setup & Running Instructions

### 1. Backend ML Server Setup (Python)

Ensure Python 3.9+ is installed on your system.

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Option A: Train initial PCA + ANN baseline model
python train.py

# Option B: Launch Flask Streaming API
python app.py
```

The Flask API server will start on **`http://127.0.0.

1:5000`**.

### 2. Frontend Launch (Web Application)

Open `web/index.html` directly in any web browser (Google Chrome, Microsoft Edge, Firefox, Brave) or use the local serve helper:

```bash
serve_local.bat
```

Then open in your browser:

```
http://localhost:8000/web/index.html
```

---

Open `web/index.html` directly in any web browser (Google Chrome, Microsoft Edge, Firefox, Brave) or run a simple local web server:

```bash
# Optional: run via Python HTTP server from project root
python -m http.server 8000
```
Then navigate to `http://localhost:8000/web/index.html`.

---

## Final-Year Demonstration Tips

1. **Dual-Mode System**:
   - If the Python Flask backend is running, the top HUD badge will display **`FLASK API ONLINE`** and process real-time OpenCV detection.
   - If offline, the web app automatically falls back to **Simulator / Browser Webcam Mode** so your project presentation works reliably anywhere without internet or camera dependency!

2. **Registering New Subjects**:
   - Navigate to the **Identities** tab or click **Snap & Register**.
   - Capture a live face snapshot or upload a photo, fill in subject details (*Name, Role, Clearance*), and click **Register Subject**.
   - The ML backend instantly updates the ANN dataset and retrains the PCA space!

3. **Connecting Firebase**:
   - Open the **Settings** tab in the web dashboard.
   - Enter your Firebase Realtime Database URL and click **Save Settings**.
