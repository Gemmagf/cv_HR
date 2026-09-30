from types import SimpleNamespace

import pytest

from app.services import matching_engine as me


def _assignment(**kw):
    base = dict(
        requisits_habilitats=[], anys_exp_min=0, anys_exp_max=None, formacio_min=None,
        idiomes_requisits=[], ubicacio_preferida=None, teletreball_ok=True,
        pes_habilitats=0.40, pes_experiencia=0.25, pes_formacio=0.15, pes_idiomes=0.10, pes_ubicacio=0.10,
        proves_requerides=[],
    )
    base.update(kw)
    return SimpleNamespace(**base)


def _candidate(**kw):
    base = dict(
        id=1, nom="Marta", cognom="Puig", habilitats_tecniques=[], habilitats_verificades=[],
        anys_exp_total=5.0, titulacio_max=None, formacions=[], idiomes=[], ubicacio="Barcelona",
        mobilitat=False, teletreball=None, resum_ia=None, ultima_posicio=None, ultima_empresa=None, foto_url=None,
    )
    base.update(kw)
    return SimpleNamespace(**base)


# --- Habilitats ---

def test_score_habilitats_sense_requisits():
    assert me.score_habilitats(["Excel"], []) == 100.0


def test_score_habilitats_declarades_vs_verificades():
    req = ["Excel", "SQL"]
    nomes_cv = me.score_habilitats(["Excel", "SQL"], req)
    assert nomes_cv == 85.0
    verificat_excel = me.score_habilitats(["Excel", "SQL"], req, [{"test_id": "excel-avancat", "passed": True, "score": 100}])
    assert verificat_excel == pytest.approx(92.5)
    tot_verificat = me.score_habilitats([], req, [
        {"test_id": "excel-avancat", "passed": True, "score": 80},
        {"test_id": "sql-intermedi", "passed": True, "score": 100},
    ])
    assert tot_verificat == 100.0


def test_score_habilitats_insensible_a_accents_i_parcial():
    assert me.score_habilitats(["Excel Avançat"], ["excel"]) == 85.0
    assert me.score_habilitats(["Canva"], ["Excel"]) == 0.0
    assert me.score_habilitats([], ["Excel"]) == 0.0


def test_prova_no_superada_no_compta_com_verificada():
    s = me.score_habilitats([], ["SAP HCM"], [{"test_id": "sap-hcm", "passed": False, "score": 40}])
    assert s == 0.0


# --- Experiència ---

def test_score_experiencia():
    assert me.score_experiencia(None, 3, None) == 0.0
    assert me.score_experiencia(5, 3, None) == 100.0
    assert me.score_experiencia(5, 3, 8) == 100.0
    assert me.score_experiencia(12, 3, 8) == 80.0      # sobrequalificació: 100 - 4*5
    assert me.score_experiencia(30, 3, 8) == 60.0      # mínim 60
    assert me.score_experiencia(1.5, 3, None) == 50.0  # subqualificació proporcional


# --- Formació ---

def test_nivell_formacio():
    assert me.nivell_formacio("Grau en Psicologia") == 3
    assert me.nivell_formacio("MBA") == 4
    assert me.nivell_formacio("Cicle Formatiu de Grau Superior") == 2
    assert me.nivell_formacio(None) == 0


def test_score_formacio():
    assert me.score_formacio(None, [], None) == 100.0
    assert me.score_formacio("Llicenciatura en Dret", [], "Grau") == 100.0
    assert me.score_formacio("MBA", [], "Grau") == 100.0
    assert me.score_formacio("Batxillerat", [], "Grau") == pytest.approx(33.3)
    assert me.score_formacio(None, [{"titol": "Grau en Estadística", "tipus": "universitaria"}], "Grau") == 100.0
    assert me.score_formacio(None, [], "Grau") == 0.0
    # requisit textual no reconegut → coincidència literal
    assert me.score_formacio("Certificat PRL", [], "PRL") == 100.0
    assert me.score_formacio("Grau en Dret", [], "PRL") == 50.0


# --- Idiomes ---

def test_score_idiomes():
    req = [{"idioma": "Anglès", "nivell_min": "B2"}]
    assert me.score_idiomes([], []) == 100.0
    assert me.score_idiomes([], req) == 0.0
    assert me.score_idiomes([{"idioma": "anglès", "nivell": "C1"}], req) == 100.0
    assert me.score_idiomes([{"idioma": "Anglès", "nivell": "A2"}], req) == 40.0
    assert me.score_idiomes([{"idioma": "Francès", "nivell": "C2"}], req) == 0.0


# --- Ubicació ---

def test_score_ubicacio():
    assert me.score_ubicacio("Girona", None, False, False, True) == 100.0
    assert me.score_ubicacio("Girona", "Barcelona", False, True, True) == 95.0
    assert me.score_ubicacio("Girona", "Barcelona", True, False, True) == 85.0
    assert me.score_ubicacio("Barcelona", "Barcelona", False, False, False) == 100.0
    assert me.score_ubicacio("Girona", "Barcelona", False, False, False) == 40.0


def test_teletreball_none_es_tracta_com_true_i_false_es_respecta():
    """Regressió: l'antiga expressió `cand.teletreball or True` ignorava el False del candidat."""
    a = _assignment(ubicacio_preferida="Barcelona", teletreball_ok=True)
    r_none = me.puntuar_candidat(_candidate(ubicacio="Girona", teletreball=None), a)
    r_false = me.puntuar_candidat(_candidate(ubicacio="Girona", teletreball=False), a)
    assert r_none.puntuacio_ubicacio == 95.0
    assert r_false.puntuacio_ubicacio == 40.0


# --- Global ---

def test_puntuar_candidat_global_i_proves_superades():
    a = _assignment(requisits_habilitats=["Excel", "SQL"], anys_exp_min=3, proves_requerides=["excel-avancat", "angles-b2"])
    c = _candidate(
        habilitats_tecniques=["Excel", "SQL"],
        habilitats_verificades=[
            {"test_id": "excel-avancat", "passed": True, "score": 100},
            {"test_id": "angles-b2", "passed": False, "score": 40},
        ],
    )
    r = me.puntuar_candidat(c, a)
    assert r.nom == "Marta Puig"
    assert r.puntuacio_habilitats == pytest.approx(92.5)
    assert r.puntuacio_experiencia == 100.0
    assert r.puntuacio_formacio == 100.0
    assert r.proves_superades == ["excel-avancat"]
    assert len(r.habilitats_verificades) == 1
    esperat = round(92.5 * 0.40 + 100 * 0.25 + 100 * 0.15 + 100 * 0.10 + 100 * 0.10, 1)
    assert r.puntuacio_global == esperat
    assert r.fortaleses_top3 and len(r.fortaleses_top3) == 3
    assert r.mancances == []


def test_candidat_verificat_puntua_mes_que_declarat():
    a = _assignment(requisits_habilitats=["Power BI"])
    declarat = me.puntuar_candidat(_candidate(id=1, habilitats_tecniques=["Power BI"]), a)
    verificat = me.puntuar_candidat(
        _candidate(id=2, habilitats_tecniques=["Power BI"], habilitats_verificades=[{"test_id": "power-bi", "passed": True, "score": 80}]), a
    )
    assert verificat.puntuacio_global > declarat.puntuacio_global
