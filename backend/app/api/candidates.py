"""
API Candidats — Mòdul A: Captura, Estructuració i Gestió de Candidats
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.candidate import Candidate, EstatCandidatura
from app.models.user import User
from app.services.cv_parser import (
    parse_cv_text,
    extract_text_from_pdf,
    extract_text_from_docx,
)

router = APIRouter()


# --- Schemas ---

class CandidateOut(BaseModel):
    id: int
    nom: str
    cognom: Optional[str]
    email: Optional[str]
    telefon: Optional[str]
    ubicacio: Optional[str]
    ultima_posicio: Optional[str]
    ultima_empresa: Optional[str]
    anys_exp_total: Optional[float]
    habilitats_tecniques: Optional[List[str]]
    habilitats_soft: Optional[List[str]]
    idiomes: Optional[List[dict]]
    disponibilitat: str
    resum_ia: Optional[str]
    foto_url: Optional[str]
    creat_el: str

    class Config:
        from_attributes = True


class CandidateUpdate(BaseModel):
    nom: Optional[str] = None
    cognom: Optional[str] = None
    email: Optional[str] = None
    telefon: Optional[str] = None
    ubicacio: Optional[str] = None
    disponibilitat: Optional[EstatCandidatura] = None
    teletreball: Optional[bool] = None
    mobilitat: Optional[bool] = None
    pretensions_sal: Optional[str] = None


# --- Endpoints ---

@router.post("/upload", status_code=201)
async def upload_cv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Puja un CV (PDF o Word), l'analitza amb IA i el desa com a candidat"""

    content_type = file.content_type or ""
    file_bytes = await file.read()

    if len(file_bytes) > settings.MAX_CV_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El fitxer supera el límit de mida")

    # Extreure text segons format
    if "pdf" in content_type or file.filename.endswith(".pdf"):
        cv_text = await extract_text_from_pdf(file_bytes)
    elif "word" in content_type or file.filename.endswith((".docx", ".doc")):
        cv_text = await extract_text_from_docx(file_bytes)
    elif "text" in content_type or file.filename.endswith(".txt"):
        cv_text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(status_code=415, detail="Format no suportat. Usa PDF, Word o text pla.")

    if not cv_text.strip():
        raise HTTPException(status_code=422, detail="No s'ha pogut extreure text del fitxer")

    # Comprovar duplicats pel hash
    data = await parse_cv_text(cv_text)
    existing = await db.execute(
        select(Candidate).where(
            Candidate.tenant_id == current_user.tenant_id,
            Candidate.hash_cv == data.get("hash_cv"),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Aquest CV ja existeix a la base de dades")

    # Crear candidat
    candidat = Candidate(
        tenant_id=current_user.tenant_id,
        creat_per=current_user.id,
        font_importacio="upload",
        **{k: v for k, v in data.items() if k not in ("cv_text_raw", "hash_cv") and hasattr(Candidate, k)},
        cv_text_raw=data.get("cv_text_raw"),
        hash_cv=data.get("hash_cv"),
    )
    db.add(candidat)
    await db.flush()

    return {"id": candidat.id, "nom": candidat.nom, "missatge": "CV processat correctament"}


@router.post("/upload-massiu", status_code=201)
async def upload_massiu(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Puja múltiples CV de cop (fins a 50 alhora)"""
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Màxim 50 fitxers per càrrega massiva")

    resultats = {"processats": 0, "duplicats": 0, "errors": []}

    for f in files:
        try:
            content_type = f.content_type or ""
            file_bytes = await f.read()

            if "pdf" in content_type or f.filename.endswith(".pdf"):
                cv_text = await extract_text_from_pdf(file_bytes)
            elif "word" in content_type or f.filename.endswith((".docx", ".doc")):
                cv_text = await extract_text_from_docx(file_bytes)
            else:
                cv_text = file_bytes.decode("utf-8", errors="ignore")

            if not cv_text.strip():
                resultats["errors"].append({"fitxer": f.filename, "error": "Sense text"})
                continue

            data = await parse_cv_text(cv_text)

            existing = await db.execute(
                select(Candidate).where(
                    Candidate.tenant_id == current_user.tenant_id,
                    Candidate.hash_cv == data.get("hash_cv"),
                )
            )
            if existing.scalar_one_or_none():
                resultats["duplicats"] += 1
                continue

            candidat = Candidate(
                tenant_id=current_user.tenant_id,
                creat_per=current_user.id,
                font_importacio="upload_massiu",
                **{k: v for k, v in data.items() if k not in ("cv_text_raw", "hash_cv") and hasattr(Candidate, k)},
                cv_text_raw=data.get("cv_text_raw"),
                hash_cv=data.get("hash_cv"),
            )
            db.add(candidat)
            resultats["processats"] += 1

        except Exception as e:
            resultats["errors"].append({"fitxer": f.filename, "error": str(e)})

    return resultats


@router.get("/", response_model=List[CandidateOut])
async def llista_candidats(
    cerca: Optional[str] = Query(None, description="Cerca per nom o habilitat"),
    disponibilitat: Optional[EstatCandidatura] = None,
    pagina: int = Query(1, ge=1),
    mida_pagina: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Llista candidats del tenant amb paginació i filtres"""
    query = select(Candidate).where(
        Candidate.tenant_id == current_user.tenant_id,
        Candidate.is_actiu == True,
    )
    if disponibilitat:
        query = query.where(Candidate.disponibilitat == disponibilitat)

    offset = (pagina - 1) * mida_pagina
    query = query.offset(offset).limit(mida_pagina).order_by(Candidate.creat_el.desc())

    result = await db.execute(query)
    candidats = result.scalars().all()

    return [
        CandidateOut(
            **{k: v for k, v in vars(c).items() if not k.startswith("_")},
            creat_el=c.creat_el.isoformat() if c.creat_el else "",
        )
        for c in candidats
    ]


@router.get("/{candidate_id}")
async def detall_candidat(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obté el detall complet d'un candidat"""
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.tenant_id == current_user.tenant_id,
        )
    )
    candidat = result.scalar_one_or_none()
    if not candidat:
        raise HTTPException(status_code=404, detail="Candidat no trobat")

    data = {k: v for k, v in vars(candidat).items() if not k.startswith("_")}
    if data.get("creat_el"):
        data["creat_el"] = data["creat_el"].isoformat()
    if data.get("actualitzat"):
        data["actualitzat"] = data["actualitzat"].isoformat()
    return data


@router.patch("/{candidate_id}")
async def actualitzar_candidat(
    candidate_id: int,
    data: CandidateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualitza les dades d'un candidat"""
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.tenant_id == current_user.tenant_id,
        )
    )
    candidat = result.scalar_one_or_none()
    if not candidat:
        raise HTTPException(status_code=404, detail="Candidat no trobat")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(candidat, field, value)

    return {"missatge": "Candidat actualitzat correctament"}


@router.delete("/{candidate_id}", status_code=204)
async def eliminar_candidat(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Desactiva (soft delete) un candidat"""
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.tenant_id == current_user.tenant_id,
        )
    )
    candidat = result.scalar_one_or_none()
    if not candidat:
        raise HTTPException(status_code=404, detail="Candidat no trobat")

    candidat.is_actiu = False
