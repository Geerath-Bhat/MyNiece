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

    class Config:
        from_attributes = True


class RegisterResponse(TokenResponse):
    user: UserOut


class PatchMeRequest(BaseModel):
    display_name: str | None = None
    timezone: str | None = None
