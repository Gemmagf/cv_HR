"""
Mòdul A — Servei de Parsing de CV amb Claude (Anthropic)
Extreu i normalitza camps estructurats de qualsevol CV (PDF, Word, text pla)

Notes d'implementació:
  * Client asíncron (`AsyncAnthropic`): el parsing es fa dins d'endpoints async de FastAPI
    i el client síncron bloquejava l'event loop durant tota la crida.
  * Sortida estructurada (`output_config.format` amb JSON Schema): l'API garanteix JSON vàlid,
    així no cal netejar blocs ```json ni fer fallback per errors de format.
  * Prompt caching del system prompt (idèntic a cada crida) per abaratir càrregues massives.
  * Fallback de seguretat activat (`fallbacks="default"`): si els classificadors declinen la
    petició, l'API la reintenta amb un altre model dins la mateixa crida.
"""

import hashlib
import json
from typing import Optional

import anthropic

from app.core.config import settings

client_ai = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY or None)

PROMPT_EXTRACTOR = """Ets un sistema expert en anàlisi de CVs. Analitza el text del CV proporcionat i extreu la informació de forma estructurada seguint exactament l'esquema JSON indicat.

INSTRUCCIONS:
- anys_exp_total: calcula'l sumant totes les experiències professionals (sense solapaments)
- anys_ultima_posicio: calcula'l des de data_inici_ultima fins avui (o fins data_fi_ultima)
- Si no trobes una dada, posa null
- habilitats_tecniques: eines, programes, tecnologies, metodologies (una entrada per habilitat, sense nivells)
- habilitats_soft: competències interpersonals detectades al text
- Normalitza els nivells d'idioma a l'escala A1-C2 (Natiu si correspon)
- El resum_ia ha de ser en català o castellà (el mateix idioma del CV), de 3-4 línies
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
    """El model no ha pogut extreure el CV (p. ex. petició declinada)."""


async def parse_cv_text(cv_text: str) -> dict:
    """
    Analitza el text d'un CV amb Claude i retorna les dades estructurades.
    Usa prompt caching per optimitzar costos en processaments massius.
    """
    response = await client_ai.beta.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=8192,  # el JSON d'un CV ocupa ~1-3K tokens; marge ampli sense arribar al timeout
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=[
            {
                "type": "text",
                "text": PROMPT_EXTRACTOR,
                "cache_control": {"type": "ephemeral"},  # Cache del system prompt
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"CV a analitzar:\n\n{cv_text}",
            }
        ],
        output_config={"format": {"type": "json_schema", "schema": CV_SCHEMA}},
    )

    if response.stop_reason == "refusal":
        raise CVParseError("El model ha declinat processar aquest document")

    raw = next((b.text for b in response.content if b.type == "text"), "")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Amb sortida estructurada no hauria de passar (p. ex. resposta tallada per max_tokens)
        data = dict(DADES_FALLBACK)

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
