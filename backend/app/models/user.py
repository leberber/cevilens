from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    DISTRIBUTOR_ADMIN = "distributor_admin"
    SUPERVISEUR = "superviseur"
    PREVENDEUR = "prevendeur"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    distributor_id: Optional[int] = Field(default=None, foreign_key="distributeurs.id", index=True)
    employe_code: Optional[str] = Field(default=None, max_length=50)
    phone: str = Field(max_length=20, index=True, unique=True)
    full_name: str = Field(max_length=100)
    hashed_password: str = Field(max_length=200)
    role: UserRole = Field(default=UserRole.SUPERVISEUR)
    is_active: bool = Field(default=True)
    nom_distributeur: Optional[str] = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(SQLModel):
    phone: str
    full_name: str
    password: str
    role: UserRole = UserRole.SUPERVISEUR
    distributor_id: Optional[int] = None
    employe_code: Optional[str] = None
    nom_distributeur: Optional[str] = None


class UserUpdate(SQLModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    distributor_id: Optional[int] = None
    employe_code: Optional[str] = None
    nom_distributeur: Optional[str] = None


class UserRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    phone: str
    full_name: str
    role: UserRole
    is_active: bool
    distributor_id: Optional[int] = None
    employe_code: Optional[str] = None
    nom_distributeur: Optional[str] = None
    created_at: datetime
