from fastapi import APIRouter, HTTPException, status
from backend.schemas.auth import LoginRequest, Token
from backend.core.security import create_access_token

router = APIRouter()

@router.post("/login", response_model=Token, summary="User Login")
def login(request: LoginRequest):
    # Standard development authentication logic (can be wired to DB users)
    if request.username in ["admin@example.com", "admin"] and request.password in ["admin123", "password"]:
        token = create_access_token(subject=request.username)
        return {"access_token": token, "token_type": "bearer"}
    
    # Allow demo login for development
    token = create_access_token(subject=request.username)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", summary="Get Current User Profile")
def get_current_user():
    return {
        "id": 1,
        "email": "manager@demandiq.internal",
        "full_name": "Store Operations Manager",
        "role": "manager",
        "is_active": True
    }
