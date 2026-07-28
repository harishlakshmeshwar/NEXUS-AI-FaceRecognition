import os
import json
import pickle
import time
import cv2
import numpy as np
from sklearn.decomposition import PCA
from sklearn.neural_network import MLPClassifier

# Path Constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

PCA_FILE = os.path.join(MODELS_DIR, 'pca_model.pkl')
ANN_FILE = os.path.join(MODELS_DIR, 'ann_model.pkl')
LABEL_MAP_FILE = os.path.join(MODELS_DIR, 'label_map.json')

N_COMPONENTS = 50

class FaceRecognitionPipeline:
    def __init__(self):
        self.pca = None
        self.ann = None
        self.label_map = {}
        self.is_trained = False
        self.recognition_threshold = float(os.environ.get("RECOGNITION_THRESHOLD", "90"))
        
        # Load OpenCV Haar Cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        self.load_models()

    def set_recognition_threshold(self, threshold):
        """Sets the minimum confidence accepted for a recognized person."""
        try:
            self.recognition_threshold = max(0.0, min(100.0, float(threshold)))
        except Exception:
            self.recognition_threshold = 90.0
        return self.recognition_threshold

    def load_models(self):
        """Loads trained PCA, ANN, and label mapping on startup if available."""
        if os.path.exists(PCA_FILE) and os.path.exists(ANN_FILE) and os.path.exists(LABEL_MAP_FILE):
            try:
                with open(LABEL_MAP_FILE, 'r') as f:
                    self.label_map = json.load(f)
                with open(PCA_FILE, 'rb') as f:
                    self.pca = pickle.load(f)
                with open(ANN_FILE, 'rb') as f:
                    self.ann = pickle.load(f)
                
                if len(self.label_map) > 0 and self.pca is not None and self.ann is not None:
                    self.is_trained = True
                    print("[ML Pipeline] Successfully loaded PCA & ANN models from disk. AI MODEL LOADED.")
                    return True
            except Exception as e:
                print(f"[ML Pipeline] Error loading models: {e}")

        self.label_map = {}
        self.is_trained = False
        print("[ML Pipeline] No trained models found or empty dataset. AI MODEL MISSING.")
        return False

    def save_models(self):
        """Serializes PCA, ANN, and label map to disk."""
        try:
            with open(LABEL_MAP_FILE, 'w') as f:
                json.dump(self.label_map, f, indent=2)
            if self.pca is not None:
                with open(PCA_FILE, 'wb') as f:
                    pickle.dump(self.pca, f)
            if self.ann is not None:
                with open(ANN_FILE, 'wb') as f:
                    pickle.dump(self.ann, f)
            print("[ML Pipeline] Saved models/pca_model.pkl, models/ann_model.pkl, models/label_map.json.")
        except Exception as e:
            print(f"[ML Pipeline Error] Failed to save models: {e}")

    def preprocess_face(self, face_img):
        """Converts cropped face image to 100x100 grayscale normalized vector."""
        if len(face_img.shape) == 3:
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = face_img

        equalized = cv2.equalizeHist(gray)
        resized = cv2.resize(equalized, (100, 100))
        norm_vector = resized.flatten().astype(np.float32) / 255.0
        norm_vector = np.nan_to_num(norm_vector, nan=0.0)
        return norm_vector, resized

    def detect_faces(self, frame):
        """Detects faces in frame using adaptive multi-stage OpenCV detection with smart center fallback."""
        if frame is None or frame.size == 0:
            return []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        eq_gray = cv2.equalizeHist(gray)

        # Stage 1: Primary cascade with high sensitivity
        faces = self.face_cascade.detectMultiScale(
            eq_gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(30, 30)
        )
        if len(faces) > 0:
            return faces

        # Stage 2: Raw grayscale without equalization
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(30, 30)
        )
        if len(faces) > 0:
            return faces

        # Stage 3: Smart Center Crop Fallback for Webcams
        h, w = frame.shape[:2]
        if h > 100 and w > 100:
            cw, ch = int(w * 0.45), int(h * 0.55)
            cx, cy = int((w - cw) / 2), int(h * 0.15)
            return [(cx, cy, cw, ch)]

        return []

    def process_frame(self, frame, verbose=False):
        """Live Recognition Pipeline: Camera -> Adaptive Face Detection -> PCA -> ANN -> Target Locked."""
        start_time = time.time()
        if frame is None or frame.size == 0:
            return frame, [], 0.0

        annotated_frame = frame.copy()
        results = []
        logs = []

        try:
            if verbose:
                logs.append('frame_received')
            faces = self.detect_faces(frame)
            if verbose:
                logs.append(f'detect_faces_count:{len(faces)}')
            
            if len(faces) == 0:
                latency_ms = round((time.time() - start_time) * 1000, 2)
                return annotated_frame, [], latency_ms

            for (x, y, w, h) in faces:
                # Draw Bright Cyber Yellow Bounding Box & Corner Brackets
                color = (0, 255, 255) # Bright Cyber Yellow (BGR)
                cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), color, 3)
                
                # Corner HUD brackets
                corner_len = min(25, int(w * 0.25))
                cv2.line(annotated_frame, (x, y), (x + corner_len, y), color, 4)
                cv2.line(annotated_frame, (x, y), (x, y + corner_len), color, 4)
                cv2.line(annotated_frame, (x + w, y), (x + w - corner_len, y), color, 4)
                cv2.line(annotated_frame, (x + w, y), (x + w, y + corner_len), color, 4)
                cv2.line(annotated_frame, (x, y + h), (x + corner_len, y + h), color, 4)
                cv2.line(annotated_frame, (x, y + h), (x, y + h - corner_len), color, 4)
                cv2.line(annotated_frame, (x + w, y + h), (x + w - corner_len, y + h), color, 4)
                cv2.line(annotated_frame, (x + w, y + h), (x + w, y + h - corner_len), color, 4)

                face_crop = frame[y:y+h, x:x+w]
                if face_crop.size == 0:
                    continue

                norm_vec, _ = self.preprocess_face(face_crop)
                
                name = "Unknown Person"
                confidence = 0.0
                user_info = None
                status = "unknown"

                if len(self.label_map) > 0:
                    try:
                        norm_vec_2d = np.nan_to_num(norm_vec.reshape(1, -1), nan=0.0)
                        if self.is_trained and self.pca is not None and self.ann is not None:
                            pca_feats = np.nan_to_num(self.pca.transform(norm_vec_2d), nan=0.0)
                            probs = self.ann.predict_proba(pca_feats)[0]
                            best_idx = int(np.argmax(probs))
                            confidence = float(probs[best_idx] * 100.0)

                            classes = self.ann.classes_
                            predicted_label_id = str(classes[best_idx])

                            matched_user_key = None
                            for k, v in self.label_map.items():
                                k_val = str(int(k) if str(k).isdigit() else abs(hash(str(k))) % 1000)
                                if k_val == predicted_label_id or str(k) == predicted_label_id:
                                    matched_user_key = k
                                    break

                            if matched_user_key is None:
                                matched_user_key = list(self.label_map.keys())[0]

                            user_info = self.label_map[matched_user_key]
                            if confidence >= self.recognition_threshold:
                                name = user_info.get("name", "Unknown Person")
                                status = "recognized"
                            else:
                                name = "Unknown Person"
                                user_info = None
                                status = "unknown"
                        else:
                            name = "Unknown Person"
                            confidence = 0.0
                            status = "unknown"
                    except Exception as inner_err:
                        name = "Unknown Person"
                        confidence = 0.0
                        status = "unknown"

                label_text = f"{name.upper()} ({confidence:.1f}%)"
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_DUPLEX, 0.75, 2)
                ty = max(y - 12, th + 10)
                cv2.rectangle(annotated_frame, (x, ty - th - 6), (x + tw + 10, ty + 6), (0, 0, 0), -1)
                cv2.putText(annotated_frame, label_text, (x + 5, ty),
                            cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 255, 255), 2)

                results.append({
                    "name": name,
                    "confidence": round(confidence, 1),
                    "user_info": user_info,
                    "status": status,
                    "bbox": [int(x), int(y), int(w), int(h)],
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                })

        except Exception as e:
            print(f"[ML Process Frame Exception] {e}")
            if verbose:
                logs.append(f'exception:{str(e)}')

        latency_ms = round((time.time() - start_time) * 1000, 2)
        if verbose:
            return annotated_frame, results, latency_ms, logs
        return annotated_frame, results, latency_ms

    def register_new_user(self, name, role, clearance, face_images, user_id=None, cloudinary_url=None, cloudinary_public_id=None):
        new_id = str(user_id) if user_id else str(len(self.label_map))
        self.label_map[new_id] = {
            "name": name,
            "role": role,
            "clearance": clearance,
            "cloudinary_url": cloudinary_url,
            "cloudinary_public_id": cloudinary_public_id
        }

        X_new = []
        y_new = []
        
        for img in face_images:
            norm_vec, _ = self.preprocess_face(img)
            X_new.append(norm_vec)
            y_new.append(int(new_id) if new_id.isdigit() else abs(hash(new_id)) % 1000)

        if len(X_new) > 0:
            augmented_X = []
            augmented_y = []
            for idx_val, vec in enumerate(X_new):
                label_val = y_new[idx_val]
                for _ in range(15):
                    jitter = vec + np.random.normal(0, 0.02, vec.shape)
                    augmented_X.append(np.clip(jitter, 0, 1))
                    augmented_y.append(label_val)

            self.retrain_model(extra_X=augmented_X, extra_y=augmented_y)
            return True, f"Successfully registered {name} with ID #{new_id}"
        
        self.retrain_model()
        return True, f"Registered user {name} in database."

    def delete_user(self, user_id):
        uid_str = str(user_id)
        if uid_str in self.label_map:
            del self.label_map[uid_str]
            self.save_models()
            if len(self.label_map) > 0:
                self.retrain_model()
            else:
                self.is_trained = False
                self.pca = None
                self.ann = None
            return True
        return False

    def retrain_model(self, extra_X=None, extra_y=None):
        """Scans dataset/ directory and trains PCA + ANN on all real registered images."""
        print("[ML Pipeline] Retraining PCA + ANN model on dataset/ images...")
        np.random.seed(42)
        dataset_dir = os.path.join(BASE_DIR, 'dataset')

        X_all = []
        y_all = []

        if os.path.exists(dataset_dir):
            for user_folder in os.listdir(dataset_dir):
                folder_path = os.path.join(dataset_dir, user_folder)
                if os.path.isdir(folder_path) and user_folder in self.label_map:
                    label_val = int(user_folder) if user_folder.isdigit() else abs(hash(user_folder)) % 1000
                    for img_name in os.listdir(folder_path):
                        if img_name.lower().endswith(('.jpg', '.jpeg', '.png')):
                            img_path = os.path.join(folder_path, img_name)
                            img = cv2.imread(img_path)
                            if img is not None:
                                norm_vec, _ = self.preprocess_face(img)
                                X_all.append(norm_vec)
                                y_all.append(label_val)

        if extra_X and extra_y:
            X_all.extend(extra_X)
            y_all.extend(extra_y)

        if len(X_all) == 0:
            print("[ML Pipeline] No training images found in dataset/. AI MODEL MISSING.")
            self.is_trained = False
            self.pca = None
            self.ann = None
            self.save_models()
            return False

        X_all = np.array(X_all, dtype=np.float32)
        y_all = np.array(y_all)

        n_samples = len(X_all)
        n_comp = min(N_COMPONENTS, max(1, n_samples - 1))
        
        self.pca = PCA(n_components=n_comp, whiten=True, random_state=42)
        X_pca = self.pca.fit_transform(X_all)

        self.ann = MLPClassifier(
            hidden_layer_sizes=(128, 64),
            activation='relu',
            solver='adam',
            max_iter=350,
            random_state=42
        )
        self.ann.fit(X_pca, y_all)
        
        self.is_trained = True
        self.save_models()
        print(f"[ML Pipeline] PCA & ANN retrained successfully on {n_samples} face samples. AI MODEL LOADED.")
        return True

pipeline = FaceRecognitionPipeline()
