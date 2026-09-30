"""
Model SkillTestAttempt — Mòdul F: invitacions i resultats de mini-proves d'habilitats

Cada fila és una invitació a un candidat per fer una prova concreta (token públic)
i, un cop respost, el resultat corregit. El resum de proves superades també es
desa a `Candidate.habilitats_verificades` per accelerar el matching.
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Enum as SAEnum
from app.core.database import Base


class EstatProva(str, enum.Enum):
    PENDENT   = "pendent"
    COMPLETAT = "completat"
    EXPIRAT   = "expirat"


class SkillTestAttempt(Base):
    __tablename__ = "skill_test_attempts"

    id            = Column(Integer, primary_key=True, index=True)
    tenant_id     = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    candidate_id  = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True, index=True)
    creat_per     = Column(Integer, ForeignKey("users.id"), nullable=True)

    test_id   = Column(String(80), nullable=False, index=True)   # id del catàleg (skill_tests.json)
    skill     = Column(String(120), nullable=False)
    token     = Column(String(64), unique=True, nullable=False, index=True)
    estat     = Column(SAEnum(EstatProva), default=EstatProva.PENDENT, nullable=False)

    # Resultat
    respostes = Column(JSON, nullable=True)     # [índex triat per pregunta]
    score     = Column(Float, nullable=True)    # 0-100
    passed    = Column(Boolean, nullable=True)
    level     = Column(String(30), nullable=True)

    creat_el     = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expira_el    = Column(DateTime(timezone=True), nullable=True)
    completat_el = Column(DateTime(timezone=True), nullable=True)

    def resum(self) -> dict:
        """Format compacte compartit amb el frontend i amb Candidate.habilitats_verificades."""
        return {
            "test_id": self.test_id,
            "skill": self.skill,
            "score": self.score,
            "passed": self.passed,
            "level": self.level,
            "data": self.completat_el.isoformat() if self.completat_el else None,
            "assignment_id": self.assignment_id,
        }
