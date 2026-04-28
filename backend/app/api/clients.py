"""
API Clients — Gestió d'empreses clients
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.client import Client
from app.models.user import User

router = APIRouter()


class ClientCreate(BaseModel):
    nom: str
    sector: Optional[str] = None
    contacte: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    notes: Optional[str] = None


@router.post("/", status_code=201)
async def crear_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = Client(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(client)
    await db.flush()
    return {"id": client.id, "nom": client.nom}


@router.get("/")
async def llista_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client).where(
            Client.tenant_id == current_user.tenant_id,
            Client.is_actiu == True,
        ).order_by(Client.nom)
    )
    clients = result.scalars().all()
    return [{"id": c.id, "nom": c.nom, "sector": c.sector, "contacte": c.contacte} for c in clients]


@router.get("/{client_id}")
async def detall_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.tenant_id == current_user.tenant_id,
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client no trobat")
    return {k: v for k, v in vars(client).items() if not k.startswith("_")}
