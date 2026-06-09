"""Demo auth endpoints.

Phase 1 has no real authentication. The login endpoint accepts any credentials
and maps a small set of demo emails to fixed personas so the UI can show
role-aware screens. Unknown emails fall back to a read-only Viewer persona.
"""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str | None = None


class AuthUser(BaseModel):
    name: str
    email: str
    role: str
    title: str


class LoginResponse(BaseModel):
    user: AuthUser
    token: str = "demo-token"


PERSONAS: dict[str, AuthUser] = {
    "priya@q360.demo": AuthUser(
        name="Priya Menon", email="priya@q360.demo",
        role="qa-manager", title="Head of Quality Assurance",
    ),
    "ravi@q360.demo": AuthUser(
        name="Ravi Iyer", email="ravi@q360.demo",
        role="qa-engineer", title="Quality Engineer",
    ),
    "arjun@q360.demo": AuthUser(
        name="Arjun Patel", email="arjun@q360.demo",
        role="lab-analyst", title="Senior Lab Analyst",
    ),
    "sneha@q360.demo": AuthUser(
        name="Sneha Iyer", email="sneha@q360.demo",
        role="sampler", title="Sampling Supervisor",
    ),
    "meera@q360.demo": AuthUser(
        name="Meera Shah", email="meera@q360.demo",
        role="stores-executive", title="Stores Executive",
    ),
    "viewer@q360.demo": AuthUser(
        name="Demo Viewer", email="viewer@q360.demo",
        role="viewer", title="Read-only access",
    ),
}


@router.get("/auth/personas", response_model=list[AuthUser])
def list_personas() -> list[AuthUser]:
    return list(PERSONAS.values())


@router.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    key = body.email.strip().lower()
    user = PERSONAS.get(key)
    if not user:
        local = key.split("@")[0] if "@" in key else key or "guest"
        nice = local.replace(".", " ").replace("_", " ").title() or "Guest"
        user = AuthUser(
            name=nice, email=key or "guest@q360.demo",
            role="viewer", title="Guest viewer",
        )
    return LoginResponse(user=user)
