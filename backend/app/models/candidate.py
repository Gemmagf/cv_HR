"""
Model Candidat — Mòdul A: Captura i Estructuració de CV
Conté tots els camps extrets i normalitzats per la IA
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum, Date
)
from sqlalchemy.dialects.postgresql import ARRAY
try:
    from pgvector.sqlalchemy import Vector
    HAS_VECTOR = True
except ImportError:
    HAS_VECTOR = False

from app.core.database import Base


class NivellIdioma(str, enum.Enum):
    A1 = "A1"; A2 = "A2"
    B1 = "B1"; B2 = "B2"
    C1 = "C1"; C2 = "C2"
    NATIU = "Natiu"


class EstatCandidatura(str, enum.Enum):
    ACTIU     = "actiu"
    PASSIU    = "passiu"      # obert a escoltar però no busca activament
    NO_DISPONIBLE = "no_disponible"


class Candidate(Base):
    __tablename__ = "candidates"

    # --- Identificació ---
    id           = Column(Integer, primary_key=True, index=True)
    tenant_id    = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    hash_cv      = Column(String(64), nullable=True, index=True)  # per deduplicació

    # --- Dades personals ---
    nom          = Column(String(150), nullable=False)
    cognom       = Column(String(150), nullable=True)
    email        = Column(String(255), nullable=True, index=True)
    telefon      = Column(String(50), nullable=True)
    ubicacio     = Column(String(200), nullable=True)
    linkedin     = Column(String(500), nullable=True)
    foto_url     = Column(String(500), nullable=True)

    # --- Experiència ---
    anys_exp_total        = Column(Float, nullable=True)  # normalitzat per IA
    anys_ultima_posicio   = Column(Float, nullable=True)  # Mòdul D
    ultima_empresa        = Column(String(200), nullable=True)
    ultima_posicio        = Column(String(200), nullable=True)
    data_inici_ultima     = Column(Date, nullable=True)
    data_fi_ultima        = Column(Date, nullable=True)  # null = actual
    experiencies          = Column(JSON, default=list)   # llista estructurada [{empresa, posicio, inici, fi, descripcio}]

    # --- Formació ---
    titulacio_max        = Column(String(200), nullable=True)
    centre_estudis       = Column(String(200), nullable=True)
    any_titulacio        = Column(Integer, nullable=True)
    formacions           = Column(JSON, default=list)    # [{titol, centre, any, tipus}]

    # --- Habilitats ---
    habilitats_tecniques = Column(JSON, default=list)   # ["Python", "SQL", ...]
    habilitats_soft      = Column(JSON, default=list)   # detectades per IA
    sector               = Column(String(200), nullable=True)
    area_funcional       = Column(String(200), nullable=True)

    # --- Idiomes ---
    idiomes              = Column(JSON, default=list)   # [{"idioma": "Anglès", "nivell": "B2"}]
    idioma_principal     = Column(String(100), nullable=True)
    nivell_angles        = Column(SAEnum(NivellIdioma), nullable=True)

    # --- Disponibilitat ---
    disponibilitat       = Column(SAEnum(EstatCandidatura), default=EstatCandidatura.ACTIU)
    disponibilitat_data  = Column(Date, nullable=True)  # disponible a partir de...
    mobilitat            = Column(Boolean, default=False)
    teletreball          = Column(Boolean, default=True)
    pretensions_sal      = Column(String(100), nullable=True)

    # --- Text original i embedding semàntic ---
    cv_text_raw          = Column(Text, nullable=True)
    cv_url               = Column(String(500), nullable=True)   # fitxer original
    resum_ia             = Column(Text, nullable=True)          # resum generat per Claude
    # embedding            = Column(Vector(1536), nullable=True)  # activar amb pgvector

    # --- Metadades ---
    font_importacio      = Column(String(100), nullable=True)   # "email", "upload", "manual"
    creat_per            = Column(Integer, ForeignKey("users.id"), nullable=True)
    creat_el             = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualitzat          = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                                  onupdate=lambda: datetime.now(timezone.utc))
    is_actiu             = Column(Boolean, default=True)
