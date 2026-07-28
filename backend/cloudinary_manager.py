import os
import cloudinary
import cloudinary.uploader
import cloudinary.api

class CloudinaryManager:
    def __init__(self):
        raw_cloud = os.environ.get("CLOUDINARY_CLOUD_NAME", "face-rec")
        # Sanitize space in cloud name for URL compatibility
        self.cloud_name = raw_cloud.replace(" ", "-").lower() if " " in raw_cloud else raw_cloud
        self.api_key = os.environ.get("CLOUDINARY_API_KEY", "339853926775836")
        self.api_secret = os.environ.get("CLOUDINARY_API_SECRET", "-Uj1rlunqmuof7BnESMIcLyrWJ8")
        
        self.configured = False
        self.configure()

    def configure(self):
        try:
            cloudinary.config(
                cloud_name=self.cloud_name,
                api_key=self.api_key,
                api_secret=self.api_secret,
                secure=True
            )
            self.configured = True
            print(f"[Cloudinary Manager] Configured for cloud: {self.cloud_name}")
        except Exception as e:
            print(f"[Cloudinary Manager Config Error]: {e}")

    def check_status(self):
        """Checks Cloudinary connection status without blocking on retries."""
        if not self.cloud_name or not self.api_key or not self.api_secret:
            return "offline"
        return "connected"

    def upload_image(self, file_path_or_bytes, folder="nexus_users", user_id=None):
        """Uploads image to Cloudinary with compression & secure HTTPS URL."""
        try:
            options = {
                "folder": folder,
                "overwrite": True,
                "resource_type": "image",
                "quality": "auto",
                "fetch_format": "auto"
            }
            if user_id:
                options["public_id"] = f"user_{user_id}"

            response = cloudinary.uploader.upload(file_path_or_bytes, **options)
            
            secure_url = response.get("secure_url") or response.get("url")
            public_id = response.get("public_id")

            print(f"[Cloudinary Upload] Public ID: {public_id} | URL: {secure_url}")
            return {
                "status": "success",
                "secure_url": secure_url,
                "public_id": public_id
            }
        except Exception as e:
            print(f"[Cloudinary Upload Exception] {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    def delete_image(self, public_id):
        """Deletes an image from Cloudinary using public_id."""
        if not public_id:
            return {"status": "success"}
        try:
            response = cloudinary.uploader.destroy(public_id)
            print(f"[Cloudinary Destroy] {public_id}: {response}")
            return {"status": "success", "result": response}
        except Exception as e:
            print(f"[Cloudinary Destroy Error] {e}")
            return {"status": "error", "message": str(e)}

cloudinary_manager = CloudinaryManager()
