import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_verified
from app.models.user import User
from app.models.baby import Baby
from app.schemas.auth import UserOut
from app.schemas.baby import BabyOut

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 5

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


def _public_id_from_url(url: str) -> str | None:
    """Extract Cloudinary public_id from a secure URL for deletion."""
    # e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/crybaby/avatars/abc.jpg
    # → crybaby/avatars/abc
    try:
        if "res.cloudinary.com" not in url:
            return None
        parts = url.split("/upload/")
        if len(parts) != 2:
            return None
        path = parts[1]
        # Strip version segment like v1234567890/
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        # Strip file extension
        path = path.rsplit(".", 1)[0]
        return path
    except Exception:
        return None


def _upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    """Validates, reads and uploads file to Cloudinary. Returns secure URL."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP, or GIF images are allowed")

    contents = file.file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {MAX_SIZE_MB}MB)")

    if not os.getenv("CLOUDINARY_CLOUD_NAME"):
        raise HTTPException(500, "Image upload is not configured on this server")

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder=folder,
            resource_type="image",
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face", "quality": "auto"}
            ],
        )
        return result["secure_url"]
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")


def _delete_old(url: str | None) -> None:
    """Best-effort deletion of previous Cloudinary asset."""
    if not url:
        return
    public_id = _public_id_from_url(url)
    if public_id:
        try:
            cloudinary.uploader.destroy(public_id)
        except Exception:
            pass  # non-fatal


@router.post("/me/avatar", response_model=UserOut)
def upload_user_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = _upload_to_cloudinary(file, folder="crybaby/avatars/users")
    _delete_old(user.avatar_url)
    user.avatar_url = url
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/babies/{baby_id}/avatar", response_model=BabyOut)
def upload_baby_avatar(
    baby_id: str,
    file: UploadFile = File(...),
    user: User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    baby = db.query(Baby).get(baby_id)
    if not baby or baby.household_id != user.household_id:
        raise HTTPException(404, "Baby not found")

    url = _upload_to_cloudinary(file, folder="crybaby/avatars/babies")
    _delete_old(baby.avatar_url)
    baby.avatar_url = url
    db.commit()
    db.refresh(baby)
    return BabyOut.model_validate(baby)
