from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone


class Objectif(SQLModel, table=True):
    __tablename__ = "objectifs"
    __table_args__ = (UniqueConstraint("code_produit", "mois", "annee", "distributor_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    distributor_id: Optional[int] = Field(default=None, foreign_key="distributeurs.id", index=True)
    code_produit: str = Field(max_length=30, index=True)
    mois: int   # 1–12
    annee: int  # 2025 …
    code_distributeur: Optional[str] = Field(default=None, max_length=30)
    nom_distributeur: Optional[str] = Field(default=None, max_length=100)
    nom_produit: Optional[str] = Field(default=None, max_length=200)

    objectif_tonne_vd: Optional[float] = Field(default=None)
    objectif_tonne_vd_tournee: Optional[float] = Field(default=None)
    objectif_packs_vd: Optional[float] = Field(default=None)
    objectif_packs_vd_tournee: Optional[float] = Field(default=None)
    objectif_tonne_vh: Optional[float] = Field(default=None)
    objectif_tonne_vh_tournee: Optional[float] = Field(default=None)
    objectif_packs_vh: Optional[float] = Field(default=None)
    objectif_packs_vh_tournee: Optional[float] = Field(default=None)

    created_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    updated_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
