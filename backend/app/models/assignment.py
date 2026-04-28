"""
Model Encàrrec (Assignment) — Mòdul E: Gestió d'Encàrrecs i Pipeline
Representa una petició de selecció d'un client amb tots els seus requisits
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Text, JSON, Boolean, Enum as SAEnum
)
from app.core.database import Base


class EstatEncarrec(str, enum.Enum):
    OBERT     = "obert"
    COBERT    = "cobert"
    DESCARTAT = "descartat"
    EN_CURS   = "en_curs"


class EstatCandidatEncarrec(str, enum.Enum):
    PROPOSAT   = "proposat"
    ENTREVISTA = "entrevista"
    OFERTA     = "oferta"
    CONTRACTAT = "contractat"
    DESCARTAT  = "descartat"


class Assignment(Base):
    """Encàrrec de selecció d'un client"""
    __tablename__ = "assignments"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    client_id   = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    creat_per   = Column(Integer, ForeignKey("users.id"), nullable=True)

    # --- Descripció del lloc ---
    titol       = Column(String(300), nullable=False)
    descripcio  = Column(Text, nullable=True)
    sector      = Column(String(150), nullable=True)
    ubicacio    = Column(String(200), nullable=True)

    # --- Requisits de matching (Mòdul B) ---
    # Cada camp és el requisit; el pes configurable s'envia a la query de matching
    requisits_habilitats  = Column(JSON, default=list)   # ["Python", "SQL", ...]
    anys_exp_min          = Column(Float, default=0)
    anys_exp_max          = Column(Float, nullable=True)
    formacio_min          = Column(String(200), nullable=True)
    idiomes_requisits     = Column(JSON, default=list)   # [{"idioma":"Anglès","nivell_min":"B2"}]
    ubicacio_preferida    = Column(String(200), nullable=True)
    teletreball_ok        = Column(Boolean, default=True)
    salari_max            = Column(String(100), nullable=True)
    notes_addicionals     = Column(Text, nullable=True)

    # Pesos configurables per al matching (0.0 - 1.0, han de sumar 1.0)
    pes_habilitats  = Column(Float, default=0.40)
    pes_experiencia = Column(Float, default=0.25)
    pes_formacio    = Column(Float, default=0.15)
    pes_idiomes     = Column(Float, default=0.10)
    pes_ubicacio    = Column(Float, default=0.10)

    # --- Estat i seguiment ---
    estat       = Column(SAEnum(EstatEncarrec), default=EstatEncarrec.OBERT, nullable=False)
    prioritat   = Column(Integer, default=2)  # 1=alta, 2=normal, 3=baixa
    data_limit  = Column(DateTime(timezone=True), nullable=True)

    creat_el    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualitzat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))


class AssignmentCandidate(Base):
    """Relació N:M entre Encàrrec i Candidat — Pipeline de selecció"""
    __tablename__ = "assignment_candidates"

    id             = Column(Integer, primary_key=True, index=True)
    assignment_id  = Column(Integer, ForeignKey("assignments.id"), nullable=False, index=True)
    candidate_id   = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    tenant_id      = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    # Resultats del matching
    puntuacio_global      = Column(Float, nullable=True)
    puntuacio_habilitats  = Column(Float, nullable=True)
    puntuacio_experiencia = Column(Float, nullable=True)
    puntuacio_formacio    = Column(Float, nullable=True)
    puntuacio_idiomes     = Column(Float, nullable=True)
    puntuacio_ubicacio    = Column(Float, nullable=True)
    fortaleses_top3       = Column(JSON, default=list)    # top 3 punts forts per a aquest encàrrec

    estat       = Column(SAEnum(EstatCandidatEncarrec), default=EstatCandidatEncarrec.PROPOSAT)
    notes       = Column(Text, nullable=True)
    proposat_el = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualitzat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))
