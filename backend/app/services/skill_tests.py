"""
Mòdul F — Mini-proves d'habilitats (Skill Checks)

Catàleg de proves curtes (5 preguntes, 6-10 minuts) que permeten:
  * al candidat, demostrar de forma proactiva les habilitats que declara al CV,
    de manera que l'empresa final no li hagi de fer una prova tècnica pròpia;
  * a l'empresa, saber quines proves tècniques són rellevants per a una posició nova.

El catàleg és el mateix fitxer JSON que fa servir el frontend (`frontend/src/data/skillTests.json`),
copiat a `app/data/skill_tests.json`. Un test comprova que les dues còpies estiguin sincronitzades.
"""

from __future__ import annotations

import json
import secrets
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Optional

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "skill_tests.json"

MIN_MATCH_LEN = 3
ORDRE_CEFR = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6, "Natiu": 7, "Native": 7}
REASON_ORDER = {"required": 0, "skill": 1, "language": 2, "role": 3}


@lru_cache(maxsize=1)
def load_catalog() -> dict:
    with CATALOG_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def all_tests() -> list[dict]:
    return load_catalog()["tests"]


def pass_score() -> int:
    return int(load_catalog().get("pass_score", 60))


def get_test(test_id: str) -> Optional[dict]:
    return next((t for t in all_tests() if t["id"] == test_id), None)


def normalize(text: Any) -> str:
    """Minúscules, sense accents ni espais sobrants (mateixa lògica que el frontend)."""
    if text is None:
        return ""
    s = unicodedata.normalize("NFD", str(text))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return " ".join(s.lower().split())


def _test_terms(test: dict) -> list[str]:
    return [normalize(x) for x in [test["skill"], *test.get("aliases", [])] if normalize(x)]


def _terms_match(skill: str, term: str) -> bool:
    if not skill or not term:
        return False
    if skill == term:
        return True
    if len(skill) < MIN_MATCH_LEN or len(term) < MIN_MATCH_LEN:
        return False
    return skill in term or term in skill


def find_tests_for_skill(skill: str) -> list[dict]:
    s = normalize(skill)
    if not s:
        return []
    return [t for t in all_tests() if any(_terms_match(s, term) for term in _test_terms(t))]


def _is_english(nom: str) -> bool:
    return any(k in nom for k in ("angl", "engl", "ingl"))


def _sorted(found: dict[str, dict]) -> list[dict]:
    return sorted(found.values(), key=lambda r: REASON_ORDER[r["reason"]])


def recommend_for_candidate(
    habilitats: Iterable[str] | None,
    idiomes: Iterable[dict] | None,
    ultima_posicio: Optional[str],
    resultats: Iterable[dict] | None = None,
) -> list[dict]:
    """
    Proves recomanades per a un candidat a partir del seu CV.
    Retorna [{test_id, skill, reason, matched, verified}] ordenat per rellevància.
    """
    found: dict[str, dict] = {}

    def add(test: dict, reason: str, matched: Any) -> None:
        found.setdefault(test["id"], {"test_id": test["id"], "skill": test["skill"], "reason": reason, "matched": matched})

    for skill in habilitats or []:
        for t in find_tests_for_skill(skill):
            add(t, "skill", skill)

    for idioma in idiomes or []:
        nom = normalize((idioma or {}).get("idioma"))
        nivell = ORDRE_CEFR.get((idioma or {}).get("nivell", ""), 0)
        if nom and _is_english(nom) and nivell >= ORDRE_CEFR["B1"]:
            for t in find_tests_for_skill("Anglès"):
                add(t, "language", idioma.get("idioma"))

    rol = normalize(ultima_posicio)
    if rol:
        for t in all_tests():
            if any(normalize(k) in rol for k in t.get("role_keywords", [])):
                add(t, "role", ultima_posicio)

    passed = {r["test_id"]: r for r in (resultats or []) if r.get("passed")}
    out = _sorted(found)
    for rec in out:
        rec["verified"] = passed.get(rec["test_id"])
    return out


def recommend_for_assignment(
    titol: Optional[str],
    requisits_habilitats: Iterable[str] | None,
    descripcio: Optional[str] = None,
    idiomes_requisits: Iterable[dict] | None = None,
) -> list[dict]:
    """
    Proves tècniques rellevants per a una posició.
    Retorna [{test_id, skill, reason, matched}] amb les habilitats requerides primer.
    """
    found: dict[str, dict] = {}

    def add(test: dict, reason: str, matched: Any) -> None:
        found.setdefault(test["id"], {"test_id": test["id"], "skill": test["skill"], "reason": reason, "matched": matched})

    for h in requisits_habilitats or []:
        skill = (h or "").strip()
        if skill:
            for t in find_tests_for_skill(skill):
                add(t, "required", skill)

    for req in idiomes_requisits or []:
        nom = normalize((req or {}).get("idioma"))
        if nom and _is_english(nom):
            for t in find_tests_for_skill("Anglès"):
                add(t, "language", req.get("idioma"))

    text = normalize(f"{titol or ''} {descripcio or ''}")
    if text:
        for t in all_tests():
            if any(normalize(k) in text for k in t.get("role_keywords", [])):
                add(t, "role", titol)

    return _sorted(found)


def level_for_score(score: float) -> str:
    levels = sorted(load_catalog()["levels"], key=lambda l: -l["min"])
    for lvl in levels:
        if score >= lvl["min"]:
            return lvl["code"]
    return levels[-1]["code"]


def score_attempt(test: dict, answers: list[Optional[int]]) -> dict:
    """Corregeix un intent: {correct, total, score, passed, level, details}."""
    details = []
    for i, q in enumerate(test["questions"]):
        given = answers[i] if i < len(answers) else None
        details.append({"id": q["id"], "correct": given == q["answer"]})
    correct = sum(1 for d in details if d["correct"])
    total = len(test["questions"])
    score = round(correct / total * 100) if total else 0
    return {
        "correct": correct,
        "total": total,
        "score": score,
        "passed": score >= pass_score(),
        "level": level_for_score(score),
        "details": details,
    }


def strip_answers(test: dict) -> dict:
    """Versió pública de la prova, sense la resposta correcta."""
    return {
        **test,
        "questions": [{k: v for k, v in q.items() if k != "answer"} for q in test["questions"]],
    }


def public_catalog() -> list[dict]:
    return [strip_answers(t) for t in all_tests()]


def new_invite_token() -> str:
    return secrets.token_urlsafe(24)


def verified_skills(resultats: Iterable[dict] | None) -> list[dict]:
    """Millor intent superat per prova."""
    best: dict[str, dict] = {}
    for r in resultats or []:
        if not r.get("passed"):
            continue
        prev = best.get(r["test_id"])
        if prev is None or r.get("score", 0) > prev.get("score", 0):
            best[r["test_id"]] = r
    return list(best.values())


def verified_skill_names(resultats: Iterable[dict] | None) -> set[str]:
    """Noms normalitzats de les habilitats verificades (inclou àlies de la prova)."""
    names: set[str] = set()
    for r in verified_skills(resultats):
        test = get_test(r["test_id"])
        if test:
            names.update(_test_terms(test))
    return names
