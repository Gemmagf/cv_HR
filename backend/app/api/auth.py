"""
API d'Autenticació — Login i registre de tenants
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User, RolUsuari
from app.models.tenant import Tenant, PlanTenant

router = APIRouter()


class RegistreRequest(BaseModel):
    nom_empresa: str
    nom_usuari: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    tenant_id: int
    nom: str


@router.post("/registre", response_model=TokenResponse, status_code=201)
async def registre(data: RegistreRequest, db: AsyncSession = Depends(get_db)):
    """Registre d'una nova empresa (tenant) amb free trial de 30 dies"""

    # Comprovar si l'email ja existeix
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="L'email ja està en ús")

    # Crear tenant
    slug = data.nom_empresa.lower().replace(" ", "-")[:50]
    tenant = Tenant(
        nom=data.nom_empresa,
        slug=slug,
        pla=PlanTenant.STARTER,
        trial_fi=datetime.now(timezone.utc) + timedelta(days=settings.FREE_TRIAL_DAYS),
        cv_limit=settings.FREE_TRIAL_CV_LIMIT,
    )
    db.add(tenant)
    await db.flush()

    # Crear usuari admin
    user = User(
        tenant_id=tenant.id,
        nom=data.nom_usuari,
        email=data.email,
        password=hash_password(data.password),
        rol=RolUsuari.ADMIN,
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "tenant_id": tenant.id, "rol": user.rol})
    return TokenResponse(
        access_token=token,
        rol=user.rol,
        tenant_id=tenant.id,
        nom=user.nom,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login amb email i contrasenya"""
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credencials incorrectes",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte desactivat")

    user.ultim_login = datetime.now(timezone.utc)

    token = create_access_token({"sub": str(user.id), "tenant_id": user.tenant_id, "rol": user.rol})
    return TokenResponse(
        access_token=token,
        rol=user.rol,
        tenant_id=user.tenant_id,
        nom=user.nom,
    )
