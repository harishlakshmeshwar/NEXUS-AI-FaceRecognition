import time
import json
import os
import requests

class FirebaseManager:
    def __init__(self):
        # User's Live Firebase Realtime Database Configuration
        self.database_url = os.environ.get(
            "FIREBASE_DATABASE_URL",
            "https://face-rec-13849-default-rtdb.asia-southeast1.firebasedatabase.app"
        )
        self.enabled = True
        print(f"[Firebase Sync Backend] Active DB: {self.database_url}")

    def log_recognition_event(self, event_data):
        """Pushes a face recognition log event to Firebase Realtime Database via REST API."""
        try:
            url = f"{self.database_url.rstrip('/')}/recognition_events.json"
            response = requests.post(url, json=event_data, timeout=3)
            if response.status_code in [200, 201]:
                print(f"[Firebase Push] Successfully pushed event for {event_data.get('name')}")
                return True, "Event pushed to Firebase"
            print(f"[Firebase Error] Status {response.status_code}: {response.text}")
            return False, f"Firebase HTTP Error {response.status_code}"
        except Exception as e:
            print(f"[Firebase Sync Exception] {e}")
            return False, f"Firebase push exception: {str(e)}"

    def save_user(self, user_id, user_data):
        """Saves a single user record under users/<user_id> node in Realtime Database."""
        try:
            url = f"{self.database_url.rstrip('/')}/users/{user_id}.json"
            response = requests.put(url, json=user_data, timeout=3)
            if response.status_code in [200, 201]:
                print(f"[Firebase User Sync] Saved user {user_id}: {user_data.get('name')}")
                return True, "User saved to Firebase"
            return False, f"Firebase HTTP Error {response.status_code}"
        except Exception as e:
            print(f"[Firebase User Sync Exception] {e}")
            return False, f"Firebase user save exception: {str(e)}"

    def delete_user(self, user_id):
        """Deletes a single user record from users/<user_id> node in Realtime Database."""
        try:
            url = f"{self.database_url.rstrip('/')}/users/{user_id}.json"
            response = requests.delete(url, timeout=3)
            if response.status_code in [200, 204]:
                print(f"[Firebase User Delete] Deleted user {user_id}")
                return True, "User deleted from Firebase"
            return False, f"Firebase HTTP Error {response.status_code}"
        except Exception as e:
            print(f"[Firebase User Delete Exception] {e}")
            return False, f"Firebase user delete exception: {str(e)}"

    def sync_registered_users(self, label_map):
        """Updates the registered user list in Firebase Realtime Database."""
        try:
            url = f"{self.database_url.rstrip('/')}/users.json"
            response = requests.put(url, json=label_map, timeout=3)
            if response.status_code == 200:
                print("[Firebase Sync] Registered users database updated.")
                return True, "Users synced to Firebase"
            return False, f"Firebase HTTP Error {response.status_code}"
        except Exception as e:
            print(f"[Firebase Sync Exception] {e}")
            return False, f"Firebase sync exception: {str(e)}"

    def sync_analytics(self, analytics_data):
        """Pushes a real analytics snapshot to Firebase Realtime Database."""
        try:
            url = f"{self.database_url.rstrip('/')}/analytics.json"
            response = requests.put(url, json=analytics_data, timeout=3)
            if response.status_code in [200, 201]:
                return True, "Analytics synced to Firebase"
            return False, f"Firebase HTTP Error {response.status_code}"
        except Exception as e:
            print(f"[Firebase Analytics Sync Exception] {e}")
            return False, f"Firebase analytics sync exception: {str(e)}"

firebase_manager = FirebaseManager()
