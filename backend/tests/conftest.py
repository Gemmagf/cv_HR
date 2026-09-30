"""
Configuració comuna dels tests del backend.

Els tests són unitaris (funcions pures dels serveis): no cal PostgreSQL ni clau d'Anthropic.
Fixem variables d'entorn abans d'importar `app` perquè `Settings` no llegeixi un .env local.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
