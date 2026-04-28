"""
Mòdul B — Motor de Cerca i Matching Intel·ligent
Puntua candidats de 0 a 100 per a cada encàrrec, amb pesos configurables per dimensió.
"""

from typing import List, Optional
from dataclasses import dataclass

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.assignment import Assignment

client_ai = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


@dataclass
class ResultatMatching:
    candidate_id: int
    nom: str
    puntuacio_global: float
    puntuacio_habilitats: float
    puntuacio_experiencia: float
    puntuacio_formacio: float
    puntuacio_idiomes: float
    puntuacio_ubicacio: float
    fortaleses_top3: List[str]
    mancances: List[str]
    resum_ia: Optional[str]
    # Dades del candidat per a la vista
    ultima_posicio: Optional[str]
    ultima_empresa: Optional[str]
    anys_exp_total: Optional[float]
    ubicacio: Optional[str]
    foto_url: Optional[str]


def score_habilitats(
    habilitats_candidat: List[str],
    habilitats_requerides: List[str],
) -> float:
    """Coincidència entre habilitats requerides i les del candidat (case-insensitive)"""
    if not habilitats_requerides:
        return 100.0
    if not habilitats_candidat:
        return 0.0

    req_lower = {h.lower() for h in habilitats_requerides}
    cand_lower = {h.lower() for h in habilitats_candidat}
    coincidencies = len(req_lower & cand_lower)
    return round((coincidencies / len(req_lower)) * 100, 1)


def score_experiencia(
    anys_candidat: Optional[float],
    anys_min: float,
    anys_max: Optional[float],
) -> float:
    """Puntua els anys d'experiència del candidat respecte al rang requerit"""
    if anys_candidat is None:
        return 0.0
    if anys_candidat >= anys_min:
        if anys_max is None or anys_candidat <= anys_max:
            return 100.0
        # Sobre-qualificació: penalitza lleugerament
        excés = anys_candidat - anys_max
        return max(60.0, 100.0 - excés * 5)
    # Sub-qualificació
    proporcio = anys_candidat / max(anys_min, 0.1)
    return round(min(proporcio * 100, 95.0), 1)


def score_idiomes(
    idiomes_candidat: List[dict],
    idiomes_requisits: List[dict],
) -> float:
    """Compara nivells d'idioma del candidat amb els requisits"""
    if not idiomes_requisits:
        return 100.0
    if not idiomes_candidat:
        return 0.0

    ORDRE = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6, "Natiu": 7}
    punts = []

    cand_idx = {i.get("idioma", "").lower(): i.get("nivell", "A1") for i in idiomes_candidat}

    for req in idiomes_requisits:
        idioma = req.get("idioma", "").lower()
        nivell_min = req.get("nivell_min", "B1")
        nivell_cand = cand_idx.get(idioma)
        if nivell_cand is None:
            punts.append(0.0)
        elif ORDRE.get(nivell_cand, 0) >= ORDRE.get(nivell_min, 0):
            punts.append(100.0)
        else:
            prop = ORDRE.get(nivell_cand, 0) / max(ORDRE.get(nivell_min, 1), 1)
            punts.append(round(prop * 80, 1))  # màxim 80% si no arriba al nivell

    return round(sum(punts) / len(punts), 1) if punts else 100.0


def score_ubicacio(
    ubicacio_candidat: Optional[str],
    ubicacio_requerida: Optional[str],
    mobilitat: bool,
    teletreball_candidat: bool,
    teletreball_ok: bool,
) -> float:
    """Puntua compatibilitat geogràfica"""
    if not ubicacio_requerida:
        return 100.0
    if teletreball_ok and teletreball_candidat:
        return 95.0  # teletreball acceptat per ambdues parts
    if mobilitat:
        return 85.0
    if ubicacio_candidat and ubicacio_requerida:
        # Coincidència de text simple (ciutat o província)
        uc = ubicacio_candidat.lower()
        ur = ubicacio_requerida.lower()
        if any(word in uc for word in ur.split()):
            return 100.0
        return 40.0
    return 50.0


def calcular_puntuacio_global(r: ResultatMatching, assignment: Assignment) -> float:
    """Pondera les puntuacions per dimensió segons els pesos de l'encàrrec"""
    return round(
        r.puntuacio_habilitats  * assignment.pes_habilitats +
        r.puntuacio_experiencia * assignment.pes_experiencia +
        r.puntuacio_formacio    * assignment.pes_formacio +
        r.puntuacio_idiomes     * assignment.pes_idiomes +
        r.puntuacio_ubicacio    * assignment.pes_ubicacio,
        1,
    )


def extreure_fortaleses(r: ResultatMatching) -> List[str]:
    """Retorna les 3 dimensions amb millor puntuació com a punts forts"""
    dims = {
        "Habilitats tècniques": r.puntuacio_habilitats,
        "Experiència": r.puntuacio_experiencia,
        "Formació": r.puntuacio_formacio,
        "Idiomes": r.puntuacio_idiomes,
        "Ubicació": r.puntuacio_ubicacio,
    }
    return [k for k, _ in sorted(dims.items(), key=lambda x: x[1], reverse=True)[:3]]


def extreure_mancances(r: ResultatMatching) -> List[str]:
    """Retorna dimensions per sota de 50 com a mancances"""
    dims = {
        "Habilitats tècniques": r.puntuacio_habilitats,
        "Experiència": r.puntuacio_experiencia,
        "Formació": r.puntuacio_formacio,
        "Idiomes": r.puntuacio_idiomes,
        "Ubicació": r.puntuacio_ubicacio,
    }
    return [k for k, v in dims.items() if v < 50]


async def match_candidates(
    assignment: Assignment,
    db: AsyncSession,
    tenant_id: int,
    limit: int = 20,
) -> List[ResultatMatching]:
    """
    Retorna els candidats més adequats per a un encàrrec, ordenats per puntuació.
    """
    # Carregar tots els candidats actius del tenant
    result = await db.execute(
        select(Candidate).where(
            Candidate.tenant_id == tenant_id,
            Candidate.is_actiu == True,
        )
    )
    candidates = result.scalars().all()

    resultats = []

    for cand in candidates:
        p_hab = score_habilitats(
            cand.habilitats_tecniques or [],
            assignment.requisits_habilitats or [],
        )
        p_exp = score_experiencia(
            cand.anys_exp_total,
            assignment.anys_exp_min or 0,
            assignment.anys_exp_max,
        )
        p_for = 70.0  # TODO: implementar scoring de formació per camp formacio_min
        p_idi = score_idiomes(
            cand.idiomes or [],
            assignment.idiomes_requisits or [],
        )
        p_ubi = score_ubicacio(
            cand.ubicacio,
            assignment.ubicacio_preferida,
            cand.mobilitat or False,
            cand.teletreball or True,
            assignment.teletreball_ok,
        )

        r = ResultatMatching(
            candidate_id=cand.id,
            nom=f"{cand.nom} {cand.cognom or ''}".strip(),
            puntuacio_global=0.0,
            puntuacio_habilitats=p_hab,
            puntuacio_experiencia=p_exp,
            puntuacio_formacio=p_for,
            puntuacio_idiomes=p_idi,
            puntuacio_ubicacio=p_ubi,
            fortaleses_top3=[],
            mancances=[],
            resum_ia=cand.resum_ia,
            ultima_posicio=cand.ultima_posicio,
            ultima_empresa=cand.ultima_empresa,
            anys_exp_total=cand.anys_exp_total,
            ubicacio=cand.ubicacio,
            foto_url=cand.foto_url,
        )
        r.puntuacio_global = calcular_puntuacio_global(r, assignment)
        r.fortaleses_top3 = extreure_fortaleses(r)
        r.mancances = extreure_mancances(r)
        resultats.append(r)

    # Ordenar per puntuació global descendent
    resultats.sort(key=lambda x: x.puntuacio_global, reverse=True)
    return resultats[:limit]
