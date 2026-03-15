from typing import Optional
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import decode_token
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only the global super_admin can access this."""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allows super_admin and household admins."""
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


def require_verified(current_user: User = Depends(get_current_user)) -> User:
    """Allows super_admin, admin and verified users. Blocks unverified members."""
    if current_user.role not in ("super_admin", "admin", "verified") and not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account needs to be verified by the admin before you can log or edit data.",
        )
    return current_user


def get_effective_household_id(
    as_household: Optional[str] = Query(None, alias="as_household"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """Returns the household_id to scope queries to.
    For super_admin: honours ?as_household=<id> if provided.
    For everyone else: always their own household_id.
    """
    if as_household and current_user.role == "super_admin":
        from app.models.household import Household
        hh = db.query(Household).filter(Household.id == as_household).first()
        if not hh:
            raise HTTPException(status_code=404, detail="Household not found")
        return as_household
    return current_user.household_id
