"""
Mòdul A — Servei de Parsing de CV amb Claude (Anthropic)
Extreu i normalitza camps estructurats de qualsevol CV (PDF, Word, text pla)
"""

import hashlib
import json
import re
from typing import Optional
import anthropic

from app.core.config import settings

client_ai = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

PROMPT_EXTRACTOR = """Ets un sistema expert en análisi de CVs. Analitza el text del CV proporcionat i extreu la informació de forma estructurada.

Retorna ÚNICAMENT un JSON vàlid amb aquesta estructura exacta (sense cap text addicional):

{
  "nom": "string",
  "cognom": "string",
  "email": "string o null",
  "telefon": "string o null",
  "ubicacio": "string o null",
  "linkedin": "string o null",
  "anys_exp_total": número (float),
  "ultima_empresa": "string o null",
  "ultima_posicio": "string o null",
  "data_inici_ultima": "YYYY-MM-DD o null",
  "data_fi_ultima": "YYYY-MM-DD o null (null = treballa aquí ara)",
  "anys_ultima_posicio": número (float),
  "experiencies": [
    {
      "empresa": "string",
      "posicio": "string",
      "inici": "YYYY-MM-DD o null",
      "fi": "YYYY-MM-DD o null",
      "descripcio": "string"
    }
  ],
  "titulacio_max": "string o null",
  "centre_estudis": "string o null",
  "any_titulacio": número o null,
  "formacions": [
    {
      "titol": "string",
      "centre": "string",
      "any": número o null,
      "tipus": "universitaria|fp|curs|certificacio|altre"
    }
  ],
  "habilitats_tecniques": ["string"],
  "habilitats_soft": ["string"],
  "sector": "string o null",
  "area_funcional": "string o null",
  "idiomes": [
    {"idioma": "string", "nivell": "A1|A2|B1|B2|C1|C2|Natiu"}
  ],
  "idioma_principal": "string o null",
  "nivell_angles": "A1|A2|B1|B2|C1|C2|Natiu|null",
  "mobilitat": true/false,
  "teletreball": true/false,
  "pretensions_sal": "string o null",
  "resum_ia": "resum professional en 3-4 línies destacant els punts clau del candidat"
}

INSTRUCCIONS:
- anys_exp_total: calcula'l sumant totes les experiències professionals
- anys_ultima_posicio: calcula'l des de data_inici_ultima fins avui (o data_fi_ultima)
- Si no trobes una dada, posa null
- habilitats_tecniques: eines, programes, tecnologies, metodologies
- habilitats_soft: competències interpersonals detectades al text
- Normalitza els nivells d'idioma a l'escala A1-C2 (Natiu si correspon)
- El resum_ia ha de ser en català o castellà (el mateix idioma del CV)
"""


def compute_hash(text: str) -> str:
    """Genera hash del text del CV per a deduplicació"""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def parse_cv_text(cv_text: str) -> dict:
    """
    Analitza el text d'un CV amb Claude i retorna les dades estructurades.
    Usa prompt caching per optimitzar costos en processaments massius.
    """
    response = client_ai.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
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
    )

    raw = response.content[0].text.strip()

    # Netejar possibles blocs de codi markdown
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: retornar dades mínimes
        data = {
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
