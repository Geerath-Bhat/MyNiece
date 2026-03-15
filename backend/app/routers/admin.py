"""Admin endpoints.

super_admin  — sees all households, can manage anyone
admin        — sees only their own household, cannot touch other admins/super_admins
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_admin, require_super_admin
from app.models.user import User
from app.models.household import Household
from app.schemas.auth import UserOut, HouseholdOut

router = APIRouter(prefix="/admin", tags=["admin"])

# Roles that a household admin is NOT allowed to touch
_PROTECTED_ROLES = ("admin", "super_admin")


def _get_target(user_id: str, admin: User, db: Session) -> User:
    """Fetch target user, enforcing household scope for non-super_admins."""
    if admin.role == "super_admin":
        target = db.query(User).filter(User.id == user_id).first()
    else:
        target = db.query(User).filter(
            User.id == user_id,
            User.household_id == admin.household_id,
        ).first()

    if not target:
        raise HTTPException(404, "User not found")

    # Household admins cannot manage other admins or the super_admin
    if admin.role != "super_admin" and target.role in _PROTECTED_ROLES:
        raise HTTPException(403, "Cannot manage another admin")

    return target


@router.get("/users", response_model=list[UserOut])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """super_admin sees everyone; household admin sees only their household."""
    if admin.role == "super_admin":
        return db.query(User).order_by(User.created_at.desc()).all()
    return (
        db.query(User)
        .filter(User.household_id == admin.household_id)
        .order_by(User.created_at.desc())
        .all()
    )


@router.patch("/users/{user_id}/verify", response_model=UserOut)
def verify_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = _get_target(user_id, admin, db)
    target.is_verified = True
    target.role = "verified"
    db.commit()
    db.refresh(target)

    # Notify the verified user via push + Telegram (fire-and-forget)
    _target_id = target.id
    _target_name = target.display_name
    _target_telegram = target.telegram_chat_id

    def _notify_verified():
        from app.database import SessionLocal
        from app.services.notification_service import send_push_to_users
        from app.services.telegram_service import send_telegram_message
        _db = SessionLocal()
        try:
            send_push_to_users(
                _db, [_target_id],
                "✅ Account verified!",
                "You can now log activities, add reminders, and more.",
                url="/",
            )
            if _target_telegram:
                send_telegram_message(
                    _target_telegram,
                    f"✅ <b>Your CryBaby account has been verified!</b>\n"
                    f"Hi {_target_name}, you now have full access to log activities.",
                )
        finally:
            _db.close()

    import threading
    threading.Thread(target=_notify_verified, daemon=True).start()

    return target


@router.patch("/users/{user_id}/unverify", response_model=UserOut)
def unverify_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = _get_target(user_id, admin, db)
    target.is_verified = False
    target.role = "member"
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/promote", response_model=UserOut)
def promote_to_admin(user_id: str, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """Promote a verified/member user to household admin. Super admin only."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == admin.id:
        raise HTTPException(400, "Cannot change your own role")
    if target.role in ("super_admin", "admin"):
        raise HTTPException(400, "User is already an admin")
    target.role = "admin"
    target.is_verified = True
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/demote", response_model=UserOut)
def demote_from_admin(user_id: str, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """Demote a household admin to verified member. Super admin only."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == admin.id:
        raise HTTPException(400, "Cannot change your own role")
    if target.role != "admin":
        raise HTTPException(400, "User is not a household admin")
    target.role = "verified"
    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    target = _get_target(user_id, admin, db)
    household_id = target.household_id

    db.delete(target)
    db.flush()  # apply user deletion before counting

    remaining = db.query(User).filter(User.household_id == household_id).count()
    if remaining == 0:
        # Last member gone — delete all babies (cascades to logs/expenses/sleep/etc.)
        # then delete the empty household
        from app.models.baby import Baby
        for baby in db.query(Baby).filter(Baby.household_id == household_id).all():
            db.delete(baby)
        db.flush()
        household = db.query(Household).filter(Household.id == household_id).first()
        if household:
            db.delete(household)

    db.commit()


@router.get("/households", response_model=list[HouseholdOut])
def list_households(admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """All households — super_admin only."""
    return db.query(Household).order_by(Household.name).all()


@router.get("/stats")
def system_stats(admin: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """System-wide stats — super_admin only."""
    from app.models.baby import Baby
    from app.models.activity_log import ActivityLog
    return {
        "total_users": db.query(User).count(),
        "verified_users": db.query(User).filter(User.is_verified == True).count(),  # noqa: E712
        "total_households": db.query(Household).count(),
        "total_babies": db.query(Baby).count(),
        "total_activity_logs": db.query(ActivityLog).count(),
    }
