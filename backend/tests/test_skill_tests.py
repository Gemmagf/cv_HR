import json
from pathlib import Path

import pytest

from app.services import skill_tests as st


def test_catalog_integritat():
    tests = st.all_tests()
    assert len(tests) >= 10
    ids = [t["id"] for t in tests]
    assert len(set(ids)) == len(ids)
    for t in tests:
        assert len(t["questions"]) == 5
        for q in t["questions"]:
            assert len(q["options"]["ca"]) == 4 and len(q["options"]["en"]) == 4
            assert 0 <= q["answer"] < 4


def test_catalog_sincronitzat_amb_frontend():
    """El frontend i el backend han de compartir exactament el mateix catàleg."""
    frontend = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "skillTests.json"
    if not frontend.exists():
        pytest.skip("frontend no present (build del backend aïllat)")
    with frontend.open(encoding="utf-8") as f:
        assert json.load(f) == st.load_catalog()


def test_normalize():
    assert st.normalize("  Excel Avançat ") == "excel avancat"
    assert st.normalize(None) == ""


def test_find_tests_for_skill():
    assert "excel-avancat" in [t["id"] for t in st.find_tests_for_skill("Excel Avançat")]
    assert "sap-hcm" in [t["id"] for t in st.find_tests_for_skill("SuccessFactors")]
    assert st.find_tests_for_skill("R") == []
    assert st.find_tests_for_skill("Canva") == []


def test_recommend_for_candidate():
    recs = st.recommend_for_candidate(
        habilitats=["SAP HCM", "LinkedIn Recruiter", "Excel", "Workday"],
        idiomes=[{"idioma": "Català", "nivell": "Natiu"}, {"idioma": "Anglès", "nivell": "C1"}],
        ultima_posicio="Cap de Selecció",
        resultats=[{"test_id": "excel-avancat", "passed": True, "score": 100}],
    )
    per_id = {r["test_id"]: r for r in recs}
    assert {"sap-hcm", "linkedin-recruiter", "excel-avancat", "workday", "angles-b2", "seleccio-competencies"} <= set(per_id)
    assert per_id["angles-b2"]["reason"] == "language"
    assert per_id["seleccio-competencies"]["reason"] == "role"
    assert per_id["excel-avancat"]["verified"]["score"] == 100
    assert per_id["sap-hcm"]["verified"] is None
    reasons = [r["reason"] for r in recs]
    assert reasons.index("role") > max(i for i, r in enumerate(reasons) if r == "skill")


def test_recommend_for_candidate_angles_nivell_baix():
    recs = st.recommend_for_candidate([], [{"idioma": "Anglès", "nivell": "A2"}], None)
    assert "angles-b2" not in {r["test_id"] for r in recs}


def test_recommend_for_assignment():
    recs = st.recommend_for_assignment("Analista de dades", ["SQL", "Power BI", "Excel"])
    assert recs[0]["reason"] == "required"
    assert {"sql-intermedi", "power-bi", "excel-avancat"} <= {r["test_id"] for r in recs[:3]}

    recs = st.recommend_for_assignment("Responsable de Compres Senior", [])
    assert "compres-negociacio" in {r["test_id"] for r in recs}
    assert all(r["reason"] == "role" for r in recs)

    recs = st.recommend_for_assignment("HRBP", [], idiomes_requisits=[{"idioma": "Anglès", "nivell_min": "B2"}])
    assert "angles-b2" in {r["test_id"] for r in recs}


def test_score_attempt_i_nivells():
    test = st.get_test("sql-intermedi")
    correct = [q["answer"] for q in test["questions"]]

    r = st.score_attempt(test, correct)
    assert (r["correct"], r["score"], r["passed"], r["level"]) == (5, 100, True, "expert")

    tres = [a if i < 3 else (a + 1) % 4 for i, a in enumerate(correct)]
    r = st.score_attempt(test, tres)
    assert (r["score"], r["passed"], r["level"]) == (60, True, "competent")

    r = st.score_attempt(test, [])
    assert (r["score"], r["passed"], r["level"]) == (0, False, "no_superat")

    r = st.score_attempt(test, [None] * 5)
    assert r["passed"] is False

    assert st.level_for_score(80) == "avancat"


def test_strip_answers_i_public_catalog():
    pub = st.public_catalog()
    assert all("answer" not in q for t in pub for q in t["questions"])
    # l'original no s'ha modificat
    assert all("answer" in q for t in st.all_tests() for q in t["questions"])


def test_verified_skills():
    v = st.verified_skills([
        {"test_id": "sql-intermedi", "passed": True, "score": 60},
        {"test_id": "sql-intermedi", "passed": True, "score": 80},
        {"test_id": "excel-avancat", "passed": False, "score": 40},
    ])
    assert len(v) == 1 and v[0]["score"] == 80
    noms = st.verified_skill_names(v)
    assert "sql" in noms and "postgresql" in noms


def test_new_invite_token_unic_i_url_safe():
    a, b = st.new_invite_token(), st.new_invite_token()
    assert a != b
    assert all(c.isalnum() or c in "-_" for c in a)
