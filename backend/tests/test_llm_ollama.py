"""
Tests del proveïdor Ollama i del parser de CV amb un servidor Ollama simulat (sense model real).
"""

import json

import httpx
import pytest

from app.core.config import settings
from app.services import llm
from app.services import cv_parser


CV_EXEMPLE = """Núria Vidal
Analista de People Analytics — Grifols (2023-actualitat)
Grau en Estadística, UB (2019)
Habilitats: Excel avançat, SQL, Power BI, Python
Idiomes: català (natiu), castellà (natiu), anglès B2
nuria.vidal@gmail.com · Barcelona
"""

RESPOSTA_MODEL = {
    "nom": "Núria", "cognom": "Vidal", "email": "nuria.vidal@gmail.com", "telefon": None,
    "ubicacio": "Barcelona", "linkedin": None, "anys_exp_total": 5, "ultima_empresa": "Grifols",
    "ultima_posicio": "Analista de People Analytics", "data_inici_ultima": "2023-02-01", "data_fi_ultima": None,
    "anys_ultima_posicio": 2, "experiencies": [], "titulacio_max": "Grau en Estadística", "centre_estudis": "UB",
    "any_titulacio": 2019, "formacions": [], "habilitats_tecniques": ["Excel avançat", "SQL", "Power BI", "Python"],
    "habilitats_soft": None, "sector": None, "area_funcional": "People Analytics",
    "idiomes": [{"idioma": "Anglès", "nivell": "B2"}], "idioma_principal": "Català", "nivell_angles": "B2",
    "mobilitat": False, "teletreball": True, "pretensions_sal": None, "resum_ia": "Analista de dades de RRHH.",
}


def _mock_transport(handler):
    """Substitueix httpx.AsyncClient per un client amb transport simulat."""
    real = httpx.AsyncClient

    class Client(real):
        def __init__(self, *a, **kw):
            kw["transport"] = httpx.MockTransport(handler)
            super().__init__(*a, **kw)

    return Client


@pytest.fixture
def ollama_mock(monkeypatch):
    peticions = []

    def handler(request: httpx.Request) -> httpx.Response:
        peticions.append(request)
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5:7b"}, {"name": "llama3.2:3b"}]})
        body = json.loads(request.content)
        assert body["stream"] is False
        assert body["format"]["type"] == "object"          # el JSON Schema viatja a `format`
        assert body["messages"][0]["role"] == "system"
        if body["model"] == "inexistent:1b":
            return httpx.Response(404, json={"error": "model not found"})
        return httpx.Response(200, json={"message": {"role": "assistant", "content": json.dumps(RESPOSTA_MODEL)}})

    monkeypatch.setattr(httpx, "AsyncClient", _mock_transport(handler))
    monkeypatch.setattr(settings, "LLM_PROVIDER", "ollama")
    monkeypatch.setattr(settings, "OLLAMA_MODEL", "qwen2.5:7b")
    return peticions


async def test_generate_json_amb_ollama(ollama_mock):
    out = await llm.generate_json("sistema", "usuari", {"type": "object", "properties": {}})
    assert out["nom"] == "Núria"
    assert ollama_mock[0].url.path == "/api/chat"
    assert json.loads(ollama_mock[0].content)["model"] == "qwen2.5:7b"


async def test_model_absent_dona_missatge_util(ollama_mock, monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_MODEL", "inexistent:1b")
    with pytest.raises(llm.LLMError, match="ollama pull inexistent:1b"):
        await llm.generate_json("s", "u", {"type": "object", "properties": {}})


async def test_ollama_models_i_describe(ollama_mock):
    assert await llm.ollama_models() == ["qwen2.5:7b", "llama3.2:3b"]
    d = llm.describe()
    assert d["provider"] == "ollama" and d["model"] == "qwen2.5:7b" and "url" in d


async def test_proveidor_desconegut(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "gpt")
    with pytest.raises(llm.LLMError, match="LLM_PROVIDER desconegut"):
        await llm.generate_json("s", "u", {})


async def test_parse_cv_text_normalitza_i_afegeix_hash(ollama_mock):
    data = await cv_parser.parse_cv_text(CV_EXEMPLE)
    assert data["nom"] == "Núria" and data["cognom"] == "Vidal"
    assert data["habilitats_tecniques"] == ["Excel avançat", "SQL", "Power BI", "Python"]
    assert data["habilitats_soft"] == []          # None → llista buida
    assert data["hash_cv"] == cv_parser.compute_hash(CV_EXEMPLE)
    assert data["cv_text_raw"] == CV_EXEMPLE
    # el system prompt i el CV han arribat al model
    body = json.loads(ollama_mock[0].content)
    assert "CV a analitzar" in body["messages"][1]["content"]
    assert body["format"] == cv_parser.CV_SCHEMA


async def test_parse_cv_text_error_de_proveidor(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("connection refused")
    monkeypatch.setattr(httpx, "AsyncClient", _mock_transport(handler))
    monkeypatch.setattr(settings, "LLM_PROVIDER", "ollama")
    with pytest.raises(cv_parser.CVParseError, match="No s'ha pogut contactar amb Ollama"):
        await cv_parser.parse_cv_text(CV_EXEMPLE)


def test_schema_del_cv_es_json_schema_valid():
    s = cv_parser.CV_SCHEMA
    assert s["type"] == "object" and s["additionalProperties"] is False
    assert set(s["required"]) == set(s["properties"])
