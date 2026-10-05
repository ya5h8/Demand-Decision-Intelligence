import re
from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional

try:
    import email_validator  # noqa: F401
    from pydantic import EmailStr
except ImportError:
    EmailStr = str  # type: ignore


# ──────────────────────────────────────────────
# Token schemas
# ──────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None


# ──────────────────────────────────────────────
# Login / OAuth2 form schema
# ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Accepts either email or username in the `username` field."""
    username: str
    password: str


# ──────────────────────────────────────────────
# Registration schemas
# ──────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8 or len(v) > 20:
            raise ValueError("Password must be between 8 and 20 characters.")
        if re.search(r"\s", v):
            raise ValueError("Password must not contain spaces.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*]", v):
            raise ValueError("Password must contain at least one special symbol (!@#$%^&*).")
        return v

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        return v


# ──────────────────────────────────────────────
# Response schemas
# ──────────────────────────────────────────────

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: str          # resolved from relationship
    is_active: bool