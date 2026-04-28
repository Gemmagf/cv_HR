"""
API Encàrrecs — Mòdul E: Gestió d'Encàrrecs i Pipeline de Selecció
"""

from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.assignment import Assignment, AssignmentCandidate, EstatEncarrec, EstatCandidatEncarrec
from app.models.user import User

router = APIRouter()


# --- Schemas ---

class AssignmentCreate(BaseModel):
    client_id: int
    titol: str
    descripcio: Optional[str] = None
    sector: Optional[str] = None
    ubicacio: Optional[str] = None
    requisits_habilitats: List[str] = []
    anys_exp_min: float = 0
    anys_exp_max: Optional[float] = None
    formacio_min: Optional[str] = None
    idiomes_requisits: List[dict] = []
    ubicacio_preferida: Optional[str] = None
    teletreball_ok: bool = True
    salari_max: Optional[str] = None
    notes_addicionals: Optional[str] = None
    pes_habilitats: float = 0.40
    pes_experiencia: float = 0.25
    pes_formacio: float = 0.15
    pes_idiomes: float = 0.10
    pes_ubicacio: float = 0.10
    prioritat: int = 2
    data_limit: Optional[datetime] = None


class EstatCandidatUpdate(BaseModel):
    estat: EstatCandidatEncarrec
    notes: Optional[str] = None


# --- Endpoints ---

@router.post("/", status_code=201)
async def crear_encarrec(
    data: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea un nou encàrrec de selecció"""
    # Validar que els pesos sumin ~1.0
    total_pesos = (
        data.pes_habilitats + data.pes_experiencia +
        data.pes_formacio + data.pes_idiomes + data.pes_ubicacio
    )
    if abs(total_pesos - 1.0) > 0.05:
        raise HTTPException(
            status_code=400,
            detail=f"Els pesos han de sumar 1.0 (actual: {total_pesos:.2f})"
        )

    encarrec = Assignment(
        tenant_id=current_user.tenant_id,
        creat_per=current_user.id,
        **data.model_dump(),
    )
    db.add(encarrec)
    await db.flush()
    return {"id": encarrec.id, "titol": encarrec.titol, "missatge": "Encàrrec creat correctament"}


@router.get("/")
async def llista_encarrecs(
    estat: Optional[EstatEncarrec] = None,
    pagina: int = Query(1, ge=1),
    mida_pagina: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Llista tots els encàrrecs del tenant"""
    query = select(Assignment).where(Assignment.tenant_id == current_user.tenant_id)
    if estat:
        query = query.where(Assignment.estat == estat)

    offset = (pagina - 1) * mida_pagina
    query = query.offset(offset).limit(mida_pagina).order_by(Assignment.creat_el.desc())

    result = await db.execute(query)
    encarrecs = result.scalars().all()

    return [
        {
            "id": e.id,
            "titol": e.titol,
            "client_id": e.client_id,
            "estat": e.estat,
            "prioritat": e.prioritat,
            "data_limit": e.data_limit.isoformat() if e.data_limit else None,
            "creat_el": e.creat_el.isoformat() if e.creat_el else None,
        }
        for e in encarrecs
    ]


@router.get("/alertes")
async def alertes_encarrecs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Alerta: encàrrecs oberts sense cap candidat proposat en les últimes 48h
    """
    llindar = datetime.now(timezone.utc) - timedelta(hours=48)

    result = await db.execute(
        select(Assignment).where(
            Assignment.tenant_id == current_user.tenant_id,
            Assignment.estat == EstatEncarrec.OBERT,
            Assignment.creat_el <= llindar,
        )
    )
    encarrecs_oberts = result.scalars().all()

    alertes = []
    for e in encarrecs_oberts:
        r = await db.execute(
            select(AssignmentCandidate).where(AssignmentCandidate.assignment_id == e.id)
        )
        if not r.scalar_one_or_none():
            alertes.append({
                "assignment_id": e.id,
                "titol": e.titol,
                "hores_obert": int((datetime.now(timezone.utc) - e.creat_el).total_seconds() / 3600),
            })

    return {"alertes": alertes, "total": len(alertes)}


@router.get("/{assignment_id}")
async def detall_encarrec(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detall complet d'un encàrrec amb el pipeline de candidats"""
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.tenant_id == current_user.tenant_id,
        )
    )
    encarrec = result.scalar_one_or_none()
    if not encarrec:
        raise HTTPException(status_code=404, detail="Encàrrec no trobat")

    # Candidats al pipeline
    r_pipeline = await db.execute(
        select(AssignmentCandidate).where(
            AssignmentCandidate.assignment_id == assignment_id
        ).order_by(AssignmentCandidate.puntuacio_global.desc())
    )
    pipeline = r_pipeline.scalars().all()

    data = {k: v for k, v in vars(encarrec).items() if not k.startswith("_")}
    if data.get("creat_el"):
        data["creat_el"] = data["creat_el"].isoformat()
    if data.get("data_limit"):
        data["data_limit"] = data["data_limit"].isoformat()

    data["pipeline"] = [
        {
            "candidate_id": p.candidate_id,
            "estat": p.estat,
            "puntuacio_global": p.puntuacio_global,
            "fortaleses_top3": p.fortaleses_top3,
            "notes": p.notes,
            "proposat_el": p.proposat_el.isoformat() if p.proposat_el else None,
        }
        for p in pipeline
    ]
    return data


@router.patch("/{assignment_id}/estat")
async def actualitzar_estat_encarrec(
    assignment_id: int,
    estat: EstatEncarrec,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Canvia l'estat d'un encàrrec"""
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.tenant_id == current_user.tenant_id,
        )
    )
    encarrec = result.scalar_one_or_none()
    if not encarrec:
        raise HTTPException(status_code=404, detail="Encàrrec no trobat")

    encarrec.estat = estat
    return {"missatge": f"Estat actualitzat a '{estat}'"}


@router.patch("/{assignment_id}/candidats/{candidate_id}/estat")
async def actualitzar_estat_candidat_pipeline(
    assignment_id: int,
    candidate_id: int,
    data: EstatCandidatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualitza l'estat d'un candidat dins el pipeline d'un encàrrec"""
    result = await db.execute(
        select(AssignmentCandidate).where(
            AssignmentCandidate.assignment_id == assignment_id,
            AssignmentCandidate.candidate_id == candidate_id,
            AssignmentCandidate.tenant_id == current_user.tenant_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Candidat no trobat en aquest encàrrec")

    item.estat = data.estat
    if data.notes:
        item.notes = data.notes

    return {"missatge": f"Estat actualitzat a '{data.estat}'"}
