from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    timezone: str = "UTC"
    household_name: str | None = None   # create new household
    invite_code: str | None = None      # join existing household


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    timezone: str
    role: str
    household_id: str
    is_verified: bool = False
    avatar_url: str | None = None
    theme: str = "aurora"

    class Config:
        from_attributes = True


class RegisterResponse(TokenResponse):
    user: UserOut


class OTPChallengeResponse(BaseModel):
    otp_required: bool = True
    user_id: str
    email_hint: str   # "g***@gmail.com"


class VerifyOTPRequest(BaseModel):
    user_id: str
    code: str


class HouseholdOut(BaseModel):
    id: str
    name: str
    invite_code: str

    class Config:
        from_attributes = True


class PatchMeRequest(BaseModel):
    display_name: str | None = None
    timezone: str | None = None
    avatar_url: str | None = None
    theme: str | None = None
    whatsapp_number: str | None = None
    telegram_chat_id: str | None = None
