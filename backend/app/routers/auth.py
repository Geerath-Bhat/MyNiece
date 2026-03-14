import random
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.household import Household
from app.models.user import User
from app.models.otp_code import OTPCode
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    UserOut, RegisterResponse, PatchMeRequest,
    OTPChallengeResponse, VerifyOTPRequest,
)
from app.services.auth_service import (
    hash_password, authenticate_user, create_access_token, get_user_by_email
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def _mask_email(email: str) -> str:
    local, domain = email.split("@")
    return f"{local[0]}***@{domain}"


def _generate_otp(db: Session, user_id: str) -> str:
    # Invalidate any existing unused OTPs for this user
    db.query(OTPCode).filter(
        OTPCode.user_id == user_id, OTPCode.used == False  # noqa: E712
    ).update({"used": True})

    code = f"{random.randint(100000, 999999)}"
    otp = OTPCode(
        user_id=user_id,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )
    db.add(otp)
    db.commit()
    return code


def _send_otp_background(to_email: str, code: str, display_name: str) -> None:
    try:
        from app.services.email_service import send_otp_email
        send_otp_email(to_email, code, display_name)
    except Exception:
        logger.exception("Failed to send OTP email to %s", _mask_email(to_email))


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    if body.invite_code:
        household = db.query(Household).filter(Household.invite_code == body.invite_code).first()
        if not household:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        role = "member"
    elif body.household_name:
        household = Household(name=body.household_name)
        db.add(household)
        db.flush()
        role = "admin"
    else:
        raise HTTPException(status_code=400, detail="Provide household_name (create) or invite_code (join)")

    user = User(
        household_id=household.id,
        email=body.email.lower(),
        display_name=body.display_name,
        password_hash=hash_password(body.password),
        timezone=body.timezone,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Notify admins of the household via Telegram
    try:
        from app.services.telegram_service import send_telegram_message
        admins = db.query(User).filter(
            User.household_id == household.id,
            User.role == "admin",
        ).all()
        msg = (
            f"👶 <b>New user joined CryBaby!</b>\n"
            f"Name: {user.display_name}\n"
            f"Email: {_mask_email(user.email)}\n"
            f"Household: {household.name}\n"
            f"Role: {role}\n\n"
            f"Open the Admin page in the app to verify them."
        )
        for admin in admins:
            if admin.telegram_chat_id:
                send_telegram_message(admin.telegram_chat_id, msg)
    except Exception:
        logger.exception("Failed to notify admins of new registration")

    token = create_access_token({"sub": user.id})
    return RegisterResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login")
def login(body: LoginRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # If SMTP not configured, skip OTP and return token directly
    if not settings.otp_enabled:
        token = create_access_token({"sub": user.id})
        return RegisterResponse(access_token=token, user=UserOut.model_validate(user))

    # Generate OTP and send via email in background (non-blocking)
    code = _generate_otp(db, user.id)
    background_tasks.add_task(_send_otp_background, user.email, code, user.display_name)

    return OTPChallengeResponse(
        user_id=user.id,
        email_hint=_mask_email(user.email),
    )


@router.post("/verify-otp", response_model=RegisterResponse)
def verify_otp(body: VerifyOTPRequest, db: Session = Depends(get_db)):
    otp = (
        db.query(OTPCode)
        .filter(
            OTPCode.user_id == body.user_id,
            OTPCode.used == False,  # noqa: E712
        )
        .order_by(OTPCode.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=401, detail="No active code found. Request a new one.")

    expires = otp.expires_at.replace(tzinfo=timezone.utc) if otp.expires_at.tzinfo is None else otp.expires_at
    if datetime.now(timezone.utc) > expires:
        otp.used = True
        db.commit()
        raise HTTPException(status_code=401, detail="Code expired. Request a new one.")

    otp.attempts += 1
    db.commit()

    if otp.attempts > OTP_MAX_ATTEMPTS:
        otp.used = True
        db.commit()
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")

    if otp.code != body.code.strip():
        remaining = OTP_MAX_ATTEMPTS - otp.attempts
        raise HTTPException(status_code=401, detail=f"Invalid code. {remaining} attempt(s) left.")

    otp.used = True
    db.commit()

    user = db.query(User).get(body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token({"sub": user.id})
    return RegisterResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/resend-otp")
def resend_otp(body: VerifyOTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Resend OTP. body.user_id required; body.code ignored."""
    if not settings.otp_enabled:
        raise HTTPException(status_code=400, detail="OTP not enabled")

    user = db.query(User).get(body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Rate-limit: 60s between resends
    last = (
        db.query(OTPCode)
        .filter(OTPCode.user_id == body.user_id)
        .order_by(OTPCode.created_at.desc())
        .first()
    )
    if last and (datetime.now(timezone.utc) - last.created_at).total_seconds() < 60:
        raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting a new code.")

    code = _generate_otp(db, user.id)
    background_tasks.add_task(_send_otp_background, user.email, code, user.display_name)
    return {"detail": f"Code sent to {_mask_email(user.email)}"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
def patch_me(body: PatchMeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field in ("display_name", "timezone", "avatar_url", "theme", "whatsapp_number", "telegram_chat_id"):
        val = getattr(body, field, None)
        if val is not None:
            setattr(current_user, field, val)
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.get("/household/invite-code")
def household_invite_code(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    return {"invite_code": household.invite_code, "household_name": household.name}


@router.get("/household/members", response_model=list[UserOut])
def household_members(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(User).filter(User.household_id == current_user.household_id).all()
    return [UserOut.model_validate(m) for m in members]


@router.delete("/household/members/{user_id}", status_code=204)
def remove_member(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    target = db.query(User).filter(
        User.id == user_id, User.household_id == current_user.household_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(target)
    db.commit()
