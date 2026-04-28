"""
Model Client — Empresa que fa l'encàrrec de selecció
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"

    id          = Column(Integer, primary_key=True, index=True)
    tenant_id   = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nom         = Column(String(200), nullable=False)
    sector      = Column(String(150), nullable=True)
    contacte    = Column(String(150), nullable=True)
    email       = Column(String(255), nullable=True)
    telefon     = Column(String(50), nullable=True)
    notes       = Column(Text, nullable=True)
    is_actiu    = Column(Boolean, default=True)
    creat_el    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualitzat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))
