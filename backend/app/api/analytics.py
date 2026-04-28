"""
API Analítica — KPIs i mètriques del dashboard
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.candidate import Candidate
from app.models.assignment import Assignment, AssignmentCandidate, EstatEncarrec, EstatCandidatEncarrec
from app.models.client import Client
from app.models.user import User

router = APIRouter()


@router.get("/dashboard")
async def dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna els KPIs principals per al dashboard"""
    tid = current_user.tenant_id

    # Total candidats actius
    r_cand = await db.execute(
        select(func.count()).where(
            Candidate.tenant_id == tid, Candidate.is_actiu == True
        )
    )
    total_candidats = r_cand.scalar()

    # Encàrrecs oberts
    r_enc_oberts = await db.execute(
        select(func.count()).where(
            Assignment.tenant_id == tid, Assignment.estat == EstatEncarrec.OBERT
        )
    )
    encarrecs_oberts = r_enc_oberts.scalar()

    # Encàrrecs coberts
    r_enc_coberts = await db.execute(
        select(func.count()).where(
            Assignment.tenant_id == tid, Assignment.estat == EstatEncarrec.COBERT
        )
    )
    encarrecs_coberts = r_enc_coberts.scalar()

    # Candidats contractats (èxit)
    r_contractats = await db.execute(
        select(func.count()).where(
            AssignmentCandidate.tenant_id == tid,
            AssignmentCandidate.estat == EstatCandidatEncarrec.CONTRACTAT,
        )
    )
    contractats = r_contractats.scalar()

    # Total clients
    r_clients = await db.execute(
        select(func.count()).where(Client.tenant_id == tid, Client.is_actiu == True)
    )
    total_clients = r_clients.scalar()

    # Taxa d'èxit (contractats / total proposats)
    r_proposats = await db.execute(
        select(func.count()).where(AssignmentCandidate.tenant_id == tid)
    )
    total_proposats = r_proposats.scalar() or 1
    taxa_exit = round((contractats / total_proposats) * 100, 1)

    return {
        "total_candidats": total_candidats,
        "encarrecs_oberts": encarrecs_oberts,
        "encarrecs_coberts": encarrecs_coberts,
        "candidats_contractats": contractats,
        "total_clients": total_clients,
        "taxa_exit_pct": taxa_exit,
        "total_proposats": total_proposats,
    }
