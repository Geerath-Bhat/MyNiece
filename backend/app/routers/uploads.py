import uuid
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_verified
from app.models.user import User
from app.models.baby import Baby
from app.schemas.auth import UserOut
from app.schemas.baby import BabyOut

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path("uploads/avatars")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 5


def _save_file(file: UploadFile) -> str:
    """Saves uploaded file, returns the relative URL path."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP, or GIF images are allowed")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    dest = UPLOAD_DIR / filename

    contents = file.file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large (max {MAX_SIZE_MB}MB)")

    dest.write_bytes(contents)
    return f"/uploads/avatars/{filename}"


@router.post("/me/avatar", response_model=UserOut)
def upload_user_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = _save_file(file)
    # Delete old avatar file if it was locally stored
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        old_path = Path(user.avatar_url.lstrip("/"))
        if old_path.exists():
            old_path.unlink(missing_ok=True)
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

    url = _save_file(file)
    if baby.avatar_url and baby.avatar_url.startswith("/uploads/"):
        old_path = Path(baby.avatar_url.lstrip("/"))
        if old_path.exists():
            old_path.unlink(missing_ok=True)
    baby.avatar_url = url
    db.commit()
    db.refresh(baby)
    return BabyOut.model_validate(baby)
