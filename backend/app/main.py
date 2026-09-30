"""
CV Hunter - Backend Principal
Sistema Intel·ligent de Gestió de Talent - Massiu Soft SL
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api import candidates, assignments, matching, clients, auth, analytics, skill_tests


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="CV Hunter API",
    description="Sistema Intel·ligent de Gestió de Talent - Massiu Soft SL",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,        prefix="/api/auth",        tags=["Autenticació"])
app.include_router(clients.router,     prefix="/api/clients",     tags=["Clients"])
app.include_router(candidates.router,  prefix="/api/candidates",  tags=["Candidats"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["Encàrrecs"])
app.include_router(matching.router,    prefix="/api/matching",    tags=["Matching"])
app.include_router(analytics.router,   prefix="/api/analytics",   tags=["Analítica"])
app.include_router(skill_tests.router, prefix="/api/skill-tests", tags=["Mini-proves d'habilitats"])


@app.get("/health")
async def health_check():
    """Estat del servei i del proveïdor d'IA (útil per comprovar que Ollama té el model carregat)."""
    from app.services import llm
    info = {"status": "ok", "app": "CV Hunter", "version": "1.1.0", "llm": llm.describe()}
    if llm.provider_name() == "ollama":
        try:
            models = await llm.ollama_models()
            info["llm"]["models_disponibles"] = models
            info["llm"]["model_carregat"] = any(m.split(":")[0] == llm.model_name().split(":")[0] for m in models)
        except Exception as e:  # noqa: BLE001
            info["llm"]["error"] = f"Ollama no accessible: {e}"
    return info
