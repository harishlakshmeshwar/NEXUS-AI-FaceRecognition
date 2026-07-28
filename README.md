# NEXUS-AI FaceRecognition 🛡️👁️

An advanced, production-ready AI face recognition system using OpenCV, PCA (Principal Component Analysis), and ANN (Artificial Neural Networks), combined with a futuristic, cyberpunk-themed web dashboard.

## 🚀 Project Overview
NEXUS-AI is designed to provide secure, real-time biometric identity verification. It captures live camera feeds, detects faces, extracts mathematical features using Eigenfaces (PCA), and classifies them using a trained Artificial Neural Network (MLPClassifier). The results are instantly synchronized via Firebase and displayed on a sleek, interactive 3D dashboard.

## 🏗️ Architecture
- **Frontend**: HTML5, Vanilla JS, CSS (Glassmorphism & Cyberpunk themes), Chart.js, Three.js (Holographic rendering).
- **Backend**: Python 3, Flask, Waitress/Gunicorn WSGI, OpenCV (Haar Cascades).
- **AI/ML Engine**: Scikit-Learn (PCA for dimensionality reduction, MLPClassifier for ANN).
- **Cloud Integrations**: Firebase Realtime Database (Telemetry), Cloudinary (Image storage).
- **Deployment**: Render (Unified Web Service).

## ✨ Features
- **Real-Time Recognition**: Fast, optimized face detection and identification.
- **Dynamic 3D Holograms**: Interactive WebGL visualizations of the PCA eigen-space.
- **Live Telemetry**: Real-time confidence charts and analytics.
- **Production-Ready API**: Fully RESTful backend with health checks and CORS configuration.
- **Cloud Syncing**: Secure, distributed logging of recognition events and registered users.

## 🛠️ Installation & Local Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/YourUsername/NEXUS-AI-FaceRecognition.git
   cd NEXUS-AI-FaceRecognition
   ```
2. **Install Python Dependencies**
   Ensure Python 3.11+ is installed.
   ```bash
   pip install -r requirements.txt
   ```
3. **Set Environment Variables**
   Rename `.env.example` to `.env` and fill in your keys.
4. **Run the Application**
   ```bash
   python backend/app.py
   ```
5. **Access the Dashboard**
   Open `http://localhost:5000` in your web browser.

## ☁️ GitHub & Render Deployment

This project is perfectly configured to be deployed as a single Web Service on Render.

### 1. GitHub Setup
- Initialize Git, commit all files, and push to a new GitHub repository.
- Ensure `dataset/`, `models/`, and `__pycache__/` are ignored via `.gitignore` unless you specifically want to deploy pre-trained models.

### 2. Render Deployment
1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Render will automatically detect the settings from `render.yaml`.
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn backend.app:app`
4. Add your Environment Variables under the "Environment" tab (see below).
5. Click **Deploy**. Your app will automatically build and start serving!

## 🔐 Environment Variables
Add these to your Render environment settings (or `.env` file locally):
```
FIREBASE_DATABASE_URL=https://<your-project>.firebasedatabase.app
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
PYTHON_VERSION=3.11.0
```

## 🔧 Troubleshooting
- **Missing Models**: If the `models/` directory is ignored in Git, the API health check will show `model: missing`. You must register users and train the model via the dashboard to generate new models on the cloud instance.
- **Camera Not Loading**: Browsers require HTTPS or `localhost` to access WebRTC camera streams. Render provides HTTPS by default.
- **Dependencies Failing**: Ensure `opencv-contrib-python-headless` is used if standard `opencv-python` fails on Linux servers (Render usually handles standard OpenCV fine with system libs).

## 📄 License
MIT License. Free for educational and commercial use.
