"""Admin-only endpoints: user management, verification, household overview."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.household import Household
from app.schemas.auth import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_all_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """List every user across all households."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/verify", response_model=UserOut)
def verify_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Grant a user the blue-tick (verified). Sets role to 'verified'."""
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot change admin role")
    user.is_verified = True
    user.role = "verified"
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/unverify", response_model=UserOut)
def unverify_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Revoke a user's verified status."""
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        raise HTTPException(400, "Cannot change admin role")
    user.is_verified = False
    user.role = "member"
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut)
def set_role(
    user_id: str, role: str,
    admin: User = Depends(require_admin), db: Session = Depends(get_db),
):
    """Set role directly: member | verified | admin."""
    if role not in ("member", "verified", "admin"):
        raise HTTPException(400, "Role must be member, verified, or admin")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.role = role
    user.is_verified = role in ("verified", "admin")
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Permanently delete a user. Admin cannot delete themselves."""
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()


@router.get("/stats")
def system_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """High-level system stats for the admin dashboard."""
    from app.models.baby import Baby
    from app.models.activity_log import ActivityLog
    return {
        "total_users": db.query(User).count(),
        "verified_users": db.query(User).filter(User.is_verified == True).count(),  # noqa: E712
        "total_households": db.query(Household).count(),
        "total_babies": db.query(Baby).count(),
        "total_activity_logs": db.query(ActivityLog).count(),
    }
