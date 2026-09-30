"""
API Mini-proves d'habilitats — Mòdul F

Rutes privades (reclutador):
  GET  /catalog                                  catàleg sense respostes
  GET  /recomanacions/candidat/{id}              proves proactives per a un candidat
  GET  /recomanacions/encarrec/{id}              proves rellevants per a un encàrrec existent
  POST /recomanacions/preview                    proves rellevants mentre s'omple el formulari
  POST /invitacions                              genera un enllaç públic per al candidat
  GET  /candidats/{id}/resultats                 resultats d'un candidat
  GET  /resultats                                resultats recents del tenant

Rutes públiques (candidat, sense login):
  GET  /public/{token}                           prova a fer (sense respostes)
  POST /public/{token}/respostes                 envia respostes → correcció
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, require_rol
from app.models.assignment import Assignment
from app.models.candidate import Candidate
from app.models.skill_test import SkillTestAttempt, EstatProva
from app.models.user import User, RolUsuari
from app.services import skill_tests as st

router = APIRouter()


# --- Schemas ---

class InvitacioCreate(BaseModel):
    candidate_id: int
    test_id: str
    assignment_id: Optional[int] = None
    dies_validesa: int = Field(default=14, ge=1, le=90)


class PreviewRequest(BaseModel):
    titol: Optional[str] = None
    descripcio: Optional[str] = None
    requisits_habilitats: List[str] = []
    idiomes_requisits: List[dict] = []


class RespostesRequest(BaseModel):
    respostes: List[Optional[int]]


def _invite_url(token: str) -> str:
    return f"{settings.PUBLIC_APP_URL.rstrip('/')}/#/prova/{token}"


async def _candidat_del_tenant(db: AsyncSession, candidate_id: int, tenant_id: int) -> Candidate:
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.tenant_id == tenant_id)
    )
    candidat = result.scalar_one_or_none()
    if not candidat:
        raise HTTPException(status_code=404, detail="Candidat no trobat")
    return candidat


# --- Rutes privades ---

@router.get("/catalog")
async def catalog(_: User = Depends(get_current_user)):
    return {"pass_score": st.pass_score(), "tests": st.public_catalog()}


@router.get("/recomanacions/candidat/{candidate_id}")
async def recomanacions_candidat(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Proves que el candidat pot fer de forma proactiva per acreditar el que diu el CV."""
    c = await _candidat_del_tenant(db, candidate_id, current_user.tenant_id)
    return st.recommend_for_candidate(
        c.habilitats_tecniques, c.idiomes, c.ultima_posicio, c.habilitats_verificades or []
    )


@router.get("/recomanacions/encarrec/{assignment_id}")
async def recomanacions_encarrec(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Proves tècniques rellevants per a un encàrrec ja creat."""
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id, Assignment.tenant_id == current_user.tenant_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Encàrrec no trobat")
    return {
        "proves_requerides": a.proves_requerides or [],
        "recomanacions": st.recommend_for_assignment(a.titol, a.requisits_habilitats, a.descripcio, a.idiomes_requisits),
    }


@router.post("/recomanacions/preview")
async def recomanacions_preview(data: PreviewRequest, _: User = Depends(get_current_user)):
    """Proves rellevants per a una posició que encara s'està definint (formulari)."""
    return st.recommend_for_assignment(data.titol, data.requisits_habilitats, data.descripcio, data.idiomes_requisits)


@router.post("/invitacions", status_code=201)
async def crear_invitacio(
    data: InvitacioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_rol(RolUsuari.ADMIN, RolUsuari.RECLUTADOR)),
):
    """Genera un enllaç públic perquè el candidat faci la prova sense registrar-se."""
    test = st.get_test(data.test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Prova desconeguda")
    await _candidat_del_tenant(db, data.candidate_id, current_user.tenant_id)

    if data.assignment_id is not None:
        r = await db.execute(
            select(Assignment).where(Assignment.id == data.assignment_id, Assignment.tenant_id == current_user.tenant_id)
        )
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Encàrrec no trobat")

    attempt = SkillTestAttempt(
        tenant_id=current_user.tenant_id,
        candidate_id=data.candidate_id,
        assignment_id=data.assignment_id,
        creat_per=current_user.id,
        test_id=test["id"],
        skill=test["skill"],
        token=st.new_invite_token(),
        expira_el=datetime.now(timezone.utc) + timedelta(days=data.dies_validesa),
    )
    db.add(attempt)
    await db.flush()
    return {"id": attempt.id, "token": attempt.token, "url": _invite_url(attempt.token), "expira_el": attempt.expira_el.isoformat()}


@router.get("/candidats/{candidate_id}/resultats")
async def resultats_candidat(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _candidat_del_tenant(db, candidate_id, current_user.tenant_id)
    result = await db.execute(
        select(SkillTestAttempt).where(
            SkillTestAttempt.candidate_id == candidate_id,
            SkillTestAttempt.tenant_id == current_user.tenant_id,
            SkillTestAttempt.estat == EstatProva.COMPLETAT,
        ).order_by(SkillTestAttempt.completat_el.desc())
    )
    return [a.resum() for a in result.scalars().all()]


@router.get("/resultats")
async def resultats_tenant(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resultats recents de tot el tenant, amb el nom del candidat."""
    result = await db.execute(
        select(SkillTestAttempt, Candidate.nom, Candidate.cognom)
        .join(Candidate, Candidate.id == SkillTestAttempt.candidate_id)
        .where(
            SkillTestAttempt.tenant_id == current_user.tenant_id,
            SkillTestAttempt.estat == EstatProva.COMPLETAT,
        )
        .order_by(SkillTestAttempt.completat_el.desc())
        .limit(min(limit, 200))
    )
    return [
        {**a.resum(), "candidate_id": a.candidate_id, "candidat_nom": f"{nom} {cognom or ''}".strip()}
        for a, nom, cognom in result.all()
    ]


# --- Rutes públiques (candidat) ---

async def _attempt_per_token(db: AsyncSession, token: str) -> SkillTestAttempt:
    result = await db.execute(select(SkillTestAttempt).where(SkillTestAttempt.token == token))
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Invitació no trobada")
    if attempt.estat == EstatProva.PENDENT and attempt.expira_el and attempt.expira_el < datetime.now(timezone.utc):
        attempt.estat = EstatProva.EXPIRAT
    return attempt


@router.get("/public/{token}")
async def prova_publica(token: str, db: AsyncSession = Depends(get_db)):
    attempt = await _attempt_per_token(db, token)
    test = st.get_test(attempt.test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Prova desconeguda")
    r = await db.execute(select(Candidate.nom).where(Candidate.id == attempt.candidate_id))
    nom = r.scalar_one_or_none()
    return {
        "test": st.strip_answers(test),
        "candidate_id": attempt.candidate_id,
        "candidat_nom": nom,
        "assignment_id": attempt.assignment_id,
        "estat": attempt.estat,
        "pass_score": st.pass_score(),
        "expira_el": attempt.expira_el.isoformat() if attempt.expira_el else None,
    }


@router.post("/public/{token}/respostes")
async def respondre_prova(token: str, data: RespostesRequest, db: AsyncSession = Depends(get_db)):
    attempt = await _attempt_per_token(db, token)
    if attempt.estat == EstatProva.COMPLETAT:
        raise HTTPException(status_code=409, detail="Aquesta prova ja s'ha respost")
    if attempt.estat == EstatProva.EXPIRAT:
        raise HTTPException(status_code=410, detail="La invitació ha caducat")

    test = st.get_test(attempt.test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Prova desconeguda")
    if len(data.respostes) != len(test["questions"]):
        raise HTTPException(status_code=422, detail="Cal una resposta (o null) per a cada pregunta")

    r = st.score_attempt(test, data.respostes)
    attempt.respostes = data.respostes
    attempt.score = r["score"]
    attempt.passed = r["passed"]
    attempt.level = r["level"]
    attempt.estat = EstatProva.COMPLETAT
    attempt.completat_el = datetime.now(timezone.utc)

    # Actualitzar el resum al candidat (el matching el fa servir)
    c = await db.execute(select(Candidate).where(Candidate.id == attempt.candidate_id))
    candidat = c.scalar_one_or_none()
    if candidat is not None:
        candidat.habilitats_verificades = [*(candidat.habilitats_verificades or []), attempt.resum()]

    return {**attempt.resum(), "correct": r["correct"], "total": r["total"], "details": r["details"]}
