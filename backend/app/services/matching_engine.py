"""
Mòdul B — Motor de Cerca i Matching Intel·ligent
Puntua candidats de 0 a 100 per a cada encàrrec, amb pesos configurables per dimensió.

Les habilitats acreditades amb una mini-prova (Mòdul F) compten al 100%;
les que només estan declarades al CV compten al 85%. Així un candidat que ha
demostrat el que diu puja de forma natural a la llista, i l'empresa sap que no
li cal fer una prova tècnica pròpia.
"""

from typing import List, Optional
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.candidate import Candidate
from app.models.assignment import Assignment
from app.services import skill_tests as st

PES_HABILITAT_DECLARADA = 0.85   # habilitat només al CV
PES_HABILITAT_VERIFICADA = 1.0   # habilitat acreditada amb mini-prova


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
    # Mini-proves d'habilitats
    habilitats_verificades: List[dict] = field(default_factory=list)
    proves_superades: List[str] = field(default_factory=list)   # ids de proves requerides per l'encàrrec i superades


def score_habilitats(
    habilitats_candidat: List[str],
    habilitats_requerides: List[str],
    habilitats_verificades: Optional[List[dict]] = None,
) -> float:
    """
    Coincidència entre habilitats requerides i les del candidat (case-insensitive, sense accents).
    Una habilitat requerida puntua 1.0 si està verificada amb una mini-prova,
    0.85 si només consta al CV i 0 si no hi és.
    """
    if not habilitats_requerides:
        return 100.0

    cand = {st.normalize(h) for h in (habilitats_candidat or []) if st.normalize(h)}
    verificades = st.verified_skill_names(habilitats_verificades)
    if not cand and not verificades:
        return 0.0

    def coincideix(req: str, conjunt: set) -> bool:
        return any(req == c or (len(req) >= 3 and len(c) >= 3 and (req in c or c in req)) for c in conjunt)

    punts = 0.0
    reqs = [st.normalize(h) for h in habilitats_requerides if st.normalize(h)]
    for req in reqs:
        if coincideix(req, verificades):
            punts += PES_HABILITAT_VERIFICADA
        elif coincideix(req, cand):
            punts += PES_HABILITAT_DECLARADA
    return round((punts / len(reqs)) * 100, 1) if reqs else 100.0


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
        exces = anys_candidat - anys_max
        return max(60.0, 100.0 - exces * 5)
    # Sub-qualificació
    proporcio = anys_candidat / max(anys_min, 0.1)
    return round(min(proporcio * 100, 95.0), 1)


NIVELLS_FORMACIO = {
    # paraula clau normalitzada → rang (com més alt, més nivell)
    "doctorat": 5, "phd": 5, "doctor": 5,
    "master": 4, "mba": 4, "postgrau": 4, "posgrado": 4,
    "grau": 3, "grado": 3, "llicenciatura": 3, "licenciatura": 3, "diplomatura": 3,
    "enginyeria": 3, "ingenieria": 3, "universit": 3, "bachelor": 3,
    "cicle formatiu": 2, "fp": 2, "formacio professional": 2, "tecnic superior": 2, "grau superior": 2,
    "batxillerat": 1, "bachillerato": 1, "eso": 1, "secundaria": 1,
}


def nivell_formacio(text: Optional[str]) -> int:
    """Converteix una titulació o tipus de formació en un rang 0-5."""
    t = st.normalize(text)
    if not t:
        return 0
    # "grau superior" / "grau mitjà" són cicles de FP, no un grau universitari
    es_fp = any(k in t for k in ("grau superior", "grau mitja", "grado superior", "grado medio", "cicle formatiu", "ciclo formativo"))
    millor = 0
    for clau, rang in NIVELLS_FORMACIO.items():
        if clau in ("grau", "grado") and es_fp:
            continue
        if clau in t:
            millor = max(millor, rang)
    return millor


def score_formacio(
    titulacio_max: Optional[str],
    formacions: Optional[List[dict]],
    formacio_min: Optional[str],
) -> float:
    """
    Compara la formació màxima del candidat amb la mínima requerida.
    Sense requisit → 100. Si el candidat arriba al nivell → 100;
    si no, proporció del nivell assolit (mínim 20 si té alguna formació).
    """
    if not formacio_min:
        return 100.0
    requerit = nivell_formacio(formacio_min)
    if requerit == 0:
        # Requisit textual no reconegut: coincidència literal amb qualsevol formació
        r = st.normalize(formacio_min)
        textos = [st.normalize(titulacio_max)] + [st.normalize(f.get("titol")) for f in (formacions or [])]
        return 100.0 if any(r and r in t for t in textos if t) else 50.0

    nivells = [nivell_formacio(titulacio_max)] + [
        max(nivell_formacio(f.get("titol")), nivell_formacio(f.get("tipus"))) for f in (formacions or [])
    ]
    assolit = max(nivells) if nivells else 0
    if assolit >= requerit:
        return 100.0
    if assolit == 0:
        return 0.0
    return round(max(20.0, assolit / requerit * 100), 1)


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

    cand_idx = {st.normalize(i.get("idioma", "")): i.get("nivell", "A1") for i in idiomes_candidat}

    for req in idiomes_requisits:
        idioma = st.normalize(req.get("idioma", ""))
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
        uc = st.normalize(ubicacio_candidat)
        ur = st.normalize(ubicacio_requerida)
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


def _dimensions(r: ResultatMatching) -> dict:
    return {
        "Habilitats tècniques": r.puntuacio_habilitats,
        "Experiència": r.puntuacio_experiencia,
        "Formació": r.puntuacio_formacio,
        "Idiomes": r.puntuacio_idiomes,
        "Ubicació": r.puntuacio_ubicacio,
    }


def extreure_fortaleses(r: ResultatMatching) -> List[str]:
    """Retorna les 3 dimensions amb millor puntuació com a punts forts"""
    return [k for k, _ in sorted(_dimensions(r).items(), key=lambda x: x[1], reverse=True)[:3]]


def extreure_mancances(r: ResultatMatching) -> List[str]:
    """Retorna dimensions per sota de 50 com a mancances"""
    return [k for k, v in _dimensions(r).items() if v < 50]


def proves_superades_per_encarrec(habilitats_verificades: Optional[List[dict]], proves_requerides: Optional[List[str]]) -> List[str]:
    """Ids de les proves que demana l'encàrrec i que el candidat ja ha superat."""
    if not proves_requerides:
        return []
    superades = {v["test_id"] for v in st.verified_skills(habilitats_verificades)}
    return [t for t in proves_requerides if t in superades]


def puntuar_candidat(cand: Candidate, assignment: Assignment) -> ResultatMatching:
    """Calcula totes les dimensions per a un candidat concret (funció pura, sense BD)."""
    verificades = cand.habilitats_verificades or []
    teletreball_cand = cand.teletreball if cand.teletreball is not None else True

    r = ResultatMatching(
        candidate_id=cand.id,
        nom=f"{cand.nom} {cand.cognom or ''}".strip(),
        puntuacio_global=0.0,
        puntuacio_habilitats=score_habilitats(
            cand.habilitats_tecniques or [], assignment.requisits_habilitats or [], verificades
        ),
        puntuacio_experiencia=score_experiencia(
            cand.anys_exp_total, assignment.anys_exp_min or 0, assignment.anys_exp_max
        ),
        puntuacio_formacio=score_formacio(cand.titulacio_max, cand.formacions, assignment.formacio_min),
        puntuacio_idiomes=score_idiomes(cand.idiomes or [], assignment.idiomes_requisits or []),
        puntuacio_ubicacio=score_ubicacio(
            cand.ubicacio, assignment.ubicacio_preferida,
            cand.mobilitat or False, teletreball_cand, assignment.teletreball_ok,
        ),
        fortaleses_top3=[],
        mancances=[],
        resum_ia=cand.resum_ia,
        ultima_posicio=cand.ultima_posicio,
        ultima_empresa=cand.ultima_empresa,
        anys_exp_total=cand.anys_exp_total,
        ubicacio=cand.ubicacio,
        foto_url=cand.foto_url,
        habilitats_verificades=st.verified_skills(verificades),
        proves_superades=proves_superades_per_encarrec(verificades, getattr(assignment, "proves_requerides", None)),
    )
    r.puntuacio_global = calcular_puntuacio_global(r, assignment)
    r.fortaleses_top3 = extreure_fortaleses(r)
    r.mancances = extreure_mancances(r)
    return r


async def match_candidates(
    assignment: Assignment,
    db: AsyncSession,
    tenant_id: int,
    limit: int = 20,
) -> List[ResultatMatching]:
    """
    Retorna els candidats més adequats per a un encàrrec, ordenats per puntuació.
    """
    result = await db.execute(
        select(Candidate).where(
            Candidate.tenant_id == tenant_id,
            Candidate.is_actiu == True,
        )
    )
    candidates = result.scalars().all()

    resultats = [puntuar_candidat(cand, assignment) for cand in candidates]
    resultats.sort(key=lambda x: x.puntuacio_global, reverse=True)
    return resultats[:limit]
