"""
Mòdul A — Servei de Parsing de CV amb LLM
Extreu i normalitza camps estructurats de qualsevol CV (PDF, Word, text pla)

El model s'executa via `app.services.llm` (models locals amb Ollama per defecte,
o Claude si LLM_PROVIDER=anthropic). La sortida es restringeix a un JSON Schema,
així el resultat sempre és JSON vàlid amb els camps esperats.
"""

import hashlib
from typing import Optional

from app.services import llm

PROMPT_EXTRACTOR = """Ets un sistema expert en anàlisi de CVs. Analitza el text del CV proporcionat i extreu la informació de forma estructurada seguint exactament l'esquema JSON indicat.

INSTRUCCIONS:
- Copia només dades que apareguin al CV. Si una dada no hi és, posa null (o una llista buida). No inventis res.
- anys_exp_total: suma els anys de totes les experiències professionals (sense solapaments)
- data_fi_ultima: null si la persona encara hi treballa ("actualitat", "present", "actual")
- anys_ultima_posicio: anys des de data_inici_ultima fins avui (o fins data_fi_ultima)
- titulacio_max: la titulació acadèmica més alta (p. ex. "Grau en Estadística"), MAI un càrrec professional
- centre_estudis: només el nom de la universitat o centre d'aquesta titulació
- sector: sector econòmic de l'última empresa (p. ex. "Farmacèutic", "Retail"); area_funcional: departament (p. ex. "RRHH")
- habilitats_tecniques: eines, programes, tecnologies, metodologies (una entrada per habilitat, sense nivells)
- habilitats_soft: competències interpersonals que el CV esmenti explícitament; si no n'esmenta cap, []
- formacions: una entrada per cada titulació o curs (tipus: universitaria per graus/màsters/postgraus)
- Normalitza els nivells d'idioma a l'escala A1-C2 (Natiu si correspon)
- resum_ia: 3-4 línies en l'idioma del CV, escrites per tu, resumint perfil, experiència i punts forts
"""

_NULLABLE_STR = {"type": ["string", "null"]}
_NULLABLE_NUM = {"type": ["number", "null"]}
_NIVELL = {"type": "string", "enum": ["A1", "A2", "B1", "B2", "C1", "C2", "Natiu"]}

CV_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "nom", "cognom", "email", "telefon", "ubicacio", "linkedin",
        "anys_exp_total", "ultima_empresa", "ultima_posicio", "data_inici_ultima", "data_fi_ultima",
        "anys_ultima_posicio", "experiencies", "titulacio_max", "centre_estudis", "any_titulacio",
        "formacions", "habilitats_tecniques", "habilitats_soft", "sector", "area_funcional",
        "idiomes", "idioma_principal", "nivell_angles", "mobilitat", "teletreball", "pretensions_sal", "resum_ia",
    ],
    "properties": {
        "nom": {"type": "string"},
        "cognom": _NULLABLE_STR,
        "email": _NULLABLE_STR,
        "telefon": _NULLABLE_STR,
        "ubicacio": _NULLABLE_STR,
        "linkedin": _NULLABLE_STR,
        "anys_exp_total": {"type": "number"},
        "ultima_empresa": _NULLABLE_STR,
        "ultima_posicio": _NULLABLE_STR,
        "data_inici_ultima": {**_NULLABLE_STR, "description": "YYYY-MM-DD o null"},
        "data_fi_ultima": {**_NULLABLE_STR, "description": "YYYY-MM-DD o null (null = treballa aquí ara)"},
        "anys_ultima_posicio": {"type": "number"},
        "experiencies": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["empresa", "posicio", "inici", "fi", "descripcio"],
                "properties": {
                    "empresa": {"type": "string"},
                    "posicio": {"type": "string"},
                    "inici": _NULLABLE_STR,
                    "fi": _NULLABLE_STR,
                    "descripcio": {"type": "string"},
                },
            },
        },
        "titulacio_max": _NULLABLE_STR,
        "centre_estudis": _NULLABLE_STR,
        "any_titulacio": {"type": ["integer", "null"]},
        "formacions": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["titol", "centre", "any", "tipus"],
                "properties": {
                    "titol": {"type": "string"},
                    "centre": {"type": "string"},
                    "any": {"type": ["integer", "null"]},
                    "tipus": {"type": "string", "enum": ["universitaria", "fp", "curs", "certificacio", "altre"]},
                },
            },
        },
        "habilitats_tecniques": {"type": "array", "items": {"type": "string"}},
        "habilitats_soft": {"type": "array", "items": {"type": "string"}},
        "sector": _NULLABLE_STR,
        "area_funcional": _NULLABLE_STR,
        "idiomes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["idioma", "nivell"],
                "properties": {"idioma": {"type": "string"}, "nivell": _NIVELL},
            },
        },
        "idioma_principal": _NULLABLE_STR,
        "nivell_angles": {"type": ["string", "null"], "enum": ["A1", "A2", "B1", "B2", "C1", "C2", "Natiu", None]},
        "mobilitat": {"type": "boolean"},
        "teletreball": {"type": "boolean"},
        "pretensions_sal": _NULLABLE_STR,
        "resum_ia": {"type": "string"},
    },
}

DADES_FALLBACK = {
    "nom": "Candidat desconegut",
    "cognom": None,
    "email": None,
    "anys_exp_total": 0,
    "habilitats_tecniques": [],
    "habilitats_soft": [],
    "idiomes": [],
    "formacions": [],
    "experiencies": [],
    "resum_ia": "No s'ha pogut processar el CV correctament.",
}


def compute_hash(text: str) -> str:
    """Genera hash del text del CV per a deduplicació"""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class CVParseError(RuntimeError):
    """El model no ha pogut extreure el CV (proveïdor inaccessible, model absent, petició declinada)."""


def _normalitza(data: dict) -> dict:
    """Els models locals de vegades ometen camps o retornen None on cal una llista."""
    out = dict(DADES_FALLBACK)
    out.update({k: v for k, v in data.items() if v is not None or k not in DADES_FALLBACK})
    for camp in ("habilitats_tecniques", "habilitats_soft", "idiomes", "formacions", "experiencies"):
        if not isinstance(out.get(camp), list):
            out[camp] = []
    if not out.get("nom"):
        out["nom"] = DADES_FALLBACK["nom"]
    return out


async def parse_cv_text(cv_text: str) -> dict:
    """Analitza el text d'un CV amb l'LLM configurat i retorna les dades estructurades."""
    try:
        data = await llm.generate_json(PROMPT_EXTRACTOR, f"CV a analitzar:\n\n{cv_text}", CV_SCHEMA)
    except llm.LLMError as e:
        raise CVParseError(str(e)) from e

    data = _normalitza(data)
    data["cv_text_raw"] = cv_text
    data["hash_cv"] = compute_hash(cv_text)
    return data


async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extreu text d'un PDF"""
    import pdfplumber
    import io

    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n".join(text_parts)


async def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extreu text d'un document Word"""
    import docx2txt
    import io
    import tempfile, os

    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        text = docx2txt.process(tmp_path)
    finally:
        os.unlink(tmp_path)
    return text
