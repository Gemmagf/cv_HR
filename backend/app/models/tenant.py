"""
Model Tenant — Multi-tenancy (cada empresa client té el seu espai aïllat)
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SAEnum
from app.core.database import Base


class PlanTenant(str, enum.Enum):
    STARTER      = "starter"       # fins 500 CV, 1 usuari
    PROFESSIONAL = "professional"  # fins 5.000 CV, 5 usuaris
    ENTERPRISE   = "enterprise"    # il·limitat, usuaris il·limitats


class Tenant(Base):
    __tablename__ = "tenants"

    id          = Column(Integer, primary_key=True, index=True)
    nom         = Column(String(200), nullable=False)
    slug        = Column(String(100), unique=True, nullable=False, index=True)
    pla         = Column(SAEnum(PlanTenant), default=PlanTenant.STARTER, nullable=False)
    is_active   = Column(Boolean, default=True)
    trial_fi    = Column(DateTime(timezone=True), nullable=True)
    cv_limit    = Column(Integer, default=50)   # per al pla free trial
    creat_el    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualitzat = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))
