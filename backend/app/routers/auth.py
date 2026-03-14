from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.household import Household
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    UserOut, RegisterResponse, PatchMeRequest
)
from app.services.auth_service import (
    hash_password, authenticate_user, create_access_token, get_user_by_email
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Resolve household
    if body.invite_code:
        household = db.query(Household).filter(Household.invite_code == body.invite_code).first()
        if not household:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        role = "member"
    elif body.household_name:
        household = Household(name=body.household_name)
        db.add(household)
        db.flush()  # get ID before committing
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

    token = create_access_token({"sub": user.id})
    return RegisterResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=RegisterResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return RegisterResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
def patch_me(body: PatchMeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.timezone is not None:
        current_user.timezone = body.timezone
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


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
