from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone


class Distributor(SQLModel, table=True):
    __tablename__ = "distributeurs"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=50)
    nom: str = Field(max_length=100)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DistributorRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    code: str
    nom: str
    is_active: bool
