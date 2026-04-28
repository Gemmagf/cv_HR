"""
Model User — Reclutadors que usen la plataforma
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SAEnum
from app.core.database import Base


class RolUsuari(str, enum.Enum):
    ADMIN      = "admin"       # pot gestionar tenant, usuaris i tot el contingut
    RECLUTADOR = "reclutador"  # pot cercar, proposar i fer seguiment
    VISOR      = "visor"       # només lectura (per a clients finals)


class User(Base):
    __tablename__ = "users"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nom         = Column(String(150), nullable=False)
    email       = Column(String(255), unique=True, nullable=False, index=True)
    password    = Column(String(255), nullable=False)
    rol         = Column(SAEnum(RolUsuari), default=RolUsuari.RECLUTADOR, nullable=False)
    is_active   = Column(Boolean, default=True)
    creat_el    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ultim_login = Column(DateTime(timezone=True), nullable=True)
