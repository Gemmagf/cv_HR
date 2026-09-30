"""
Capa de proveïdor d'LLM — permet executar la IA amb models locals o amb l'API d'Anthropic.

    LLM_PROVIDER=ollama     (per defecte) model local via Ollama: cap clau, cap cost, dades en local
    LLM_PROVIDER=anthropic  Claude via API (cal ANTHROPIC_API_KEY)

Tots dos proveïdors exposen la mateixa funció:

    await generate_json(system, user, schema) -> dict

que retorna un objecte JSON validat contra l'esquema donat. Amb Ollama s'usa el paràmetre
`format` (sortida restringida a un JSON Schema, disponible des d'Ollama 0.5); amb Anthropic,
`output_config.format` (structured outputs).
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings


class LLMError(RuntimeError):
    """El proveïdor no ha pogut generar una resposta vàlida."""


class LLMRefusal(LLMError):
    """El model ha declinat processar la petició."""


# ─── Ollama (models locals) ───────────────────────────────────────────────────

async def _ollama_json(system: str, user: str, schema: dict, model: str | None = None) -> dict:
    payload = {
        "model": model or settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "format": schema,          # JSON Schema → sortida garantida
        "stream": False,
        "options": {"temperature": 0, "num_ctx": settings.OLLAMA_NUM_CTX},
    }
    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            r = await client.post(f"{settings.OLLAMA_URL.rstrip('/')}/api/chat", json=payload)
    except httpx.HTTPError as e:
        raise LLMError(f"No s'ha pogut contactar amb Ollama a {settings.OLLAMA_URL}: {e}") from e

    if r.status_code == 404:
        raise LLMError(
            f"El model '{payload['model']}' no és a Ollama. Executa: ollama pull {payload['model']}"
        )
    if r.status_code >= 400:
        raise LLMError(f"Ollama ha respost {r.status_code}: {r.text[:200]}")

    content = r.json().get("message", {}).get("content", "")
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise LLMError("Ollama ha retornat un JSON invàlid") from e


async def ollama_models() -> list[str]:
    """Models disponibles a la instància local (per a /health i diagnòstic)."""
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(f"{settings.OLLAMA_URL.rstrip('/')}/api/tags")
        r.raise_for_status()
        return [m["name"] for m in r.json().get("models", [])]


# ─── Anthropic (Claude) ───────────────────────────────────────────────────────

async def _anthropic_json(system: str, user: str, schema: dict, model: str | None = None) -> dict:
    import anthropic  # import tardà: només cal si s'usa aquest proveïdor

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY or None)
    response = await client.beta.messages.create(
        model=model or settings.CLAUDE_MODEL,
        max_tokens=8192,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    if response.stop_reason == "refusal":
        raise LLMRefusal("El model ha declinat processar aquest document")
    raw = next((b.text for b in response.content if b.type == "text"), "")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise LLMError("Resposta JSON invàlida (possiblement tallada per max_tokens)") from e


# ─── API pública ──────────────────────────────────────────────────────────────

PROVIDERS = {"ollama": _ollama_json, "anthropic": _anthropic_json}


def provider_name() -> str:
    return settings.LLM_PROVIDER.lower()


def model_name() -> str:
    return settings.OLLAMA_MODEL if provider_name() == "ollama" else settings.CLAUDE_MODEL


async def generate_json(system: str, user: str, schema: dict, model: str | None = None) -> dict:
    """Genera un objecte JSON conforme a `schema` amb el proveïdor configurat."""
    fn = PROVIDERS.get(provider_name())
    if fn is None:
        raise LLMError(f"LLM_PROVIDER desconegut: {settings.LLM_PROVIDER} (usa 'ollama' o 'anthropic')")
    return await fn(system, user, schema, model)


def describe() -> dict[str, Any]:
    """Informació del proveïdor actiu (per a /health)."""
    return {"provider": provider_name(), "model": model_name(),
            **({"url": settings.OLLAMA_URL} if provider_name() == "ollama" else {})}
