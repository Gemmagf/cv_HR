"""
API Matching — Mòdul B: Motor de Cerca i Matching Intel·ligent
Mòdul C: Visualització i exportació de resultats
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.assignment import Assignment, AssignmentCandidate
from app.models.user import User
from app.services.matching_engine import match_candidates, ResultatMatching
from app.services.pdf_exporter import generar_pdf_proposta

router = APIRouter()


@router.get("/encarrec/{assignment_id}")
async def matching_encarrec(
    assignment_id: int,
    limit: int = Query(20, ge=1, le=100),
    puntuacio_min: float = Query(0.0, ge=0.0, le=100.0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna els candidats més adequats per a un encàrrec,
    ordenats per puntuació global descendent.
    """
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.tenant_id == current_user.tenant_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Encàrrec no trobat")

    candidats = await match_candidates(assignment, db, current_user.tenant_id, limit=limit)

    # Filtrar per puntuació mínima
    candidats = [c for c in candidats if c.puntuacio_global >= puntuacio_min]

    return {
        "encarrec_id": assignment_id,
        "titol": assignment.titol,
        "total_candidats": len(candidats),
        "candidats": [
            {
                "candidate_id": c.candidate_id,
                "nom": c.nom,
                "ultima_posicio": c.ultima_posicio,
                "ultima_empresa": c.ultima_empresa,
                "anys_exp_total": c.anys_exp_total,
                "ubicacio": c.ubicacio,
                "foto_url": c.foto_url,
                "puntuacio_global": c.puntuacio_global,
                "puntuacio_habilitats": c.puntuacio_habilitats,
                "puntuacio_experiencia": c.puntuacio_experiencia,
                "puntuacio_formacio": c.puntuacio_formacio,
                "puntuacio_idiomes": c.puntuacio_idiomes,
                "puntuacio_ubicacio": c.puntuacio_ubicacio,
                "fortaleses_top3": c.fortaleses_top3,
                "mancances": c.mancances,
                "resum_ia": c.resum_ia,
            }
            for c in candidats
        ],
    }


@router.post("/encarrec/{assignment_id}/proposar")
async def proposar_candidats(
    assignment_id: int,
    candidate_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Afegeix els candidats seleccionats al pipeline de l'encàrrec.
    Guarda les puntuacions de matching al registre.
    """
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.tenant_id == current_user.tenant_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Encàrrec no trobat")

    # Fer matching per obtenir puntuacions
    tots_resultats = await match_candidates(assignment, db, current_user.tenant_id, limit=200)
    resultats_idx = {r.candidate_id: r for r in tots_resultats}

    afegits = 0
    for cid in candidate_ids:
        # Comprovar si ja existeix
        existing = await db.execute(
            select(AssignmentCandidate).where(
                AssignmentCandidate.assignment_id == assignment_id,
                AssignmentCandidate.candidate_id == cid,
            )
        )
        if existing.scalar_one_or_none():
            continue

        r = resultats_idx.get(cid)
        ac = AssignmentCandidate(
            assignment_id=assignment_id,
            candidate_id=cid,
            tenant_id=current_user.tenant_id,
            puntuacio_global=r.puntuacio_global if r else None,
            puntuacio_habilitats=r.puntuacio_habilitats if r else None,
            puntuacio_experiencia=r.puntuacio_experiencia if r else None,
            puntuacio_formacio=r.puntuacio_formacio if r else None,
            puntuacio_idiomes=r.puntuacio_idiomes if r else None,
            puntuacio_ubicacio=r.puntuacio_ubicacio if r else None,
            fortaleses_top3=r.fortaleses_top3 if r else [],
        )
        db.add(ac)
        afegits += 1

    return {"missatge": f"{afegits} candidat(s) afegit(s) al pipeline", "afegits": afegits}


@router.get("/encarrec/{assignment_id}/exportar-pdf")
async def exportar_pdf_proposta(
    assignment_id: int,
    candidate_ids: str = Query(..., description="IDs separats per comes: 1,2,3"),
    nom_client: str = Query("Client"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Genera i descarrega un PDF professional amb els candidats seleccionats.
    """
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.tenant_id == current_user.tenant_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Encàrrec no trobat")

    ids = [int(x.strip()) for x in candidate_ids.split(",") if x.strip().isdigit()]
    tots_resultats = await match_candidates(assignment, db, current_user.tenant_id, limit=200)
    candidats_seleccionats = [r for r in tots_resultats if r.candidate_id in ids]

    if not candidats_seleccionats:
        raise HTTPException(status_code=400, detail="Cap candidat vàlid per exportar")

    pdf_bytes = generar_pdf_proposta(
        candidats=candidats_seleccionats,
        titol_encarrec=assignment.titol,
        nom_client=nom_client,
    )

    nom_fitxer = f"proposta_{assignment.titol[:30].replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nom_fitxer}"},
    )
