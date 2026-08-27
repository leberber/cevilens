from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, require_platform_admin
from app.database import get_session
from app.models.user import User
from app.models.distributor import Distributor, DistributorRead

router = APIRouter()


@router.get("", response_model=List[DistributorRead])
def list_distributors(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[DistributorRead]:
    """List all distributors (any logged-in user)."""
    return session.exec(
        select(Distributor).order_by(Distributor.nom)
    ).all()


@router.get("/{distributor_id}")
def get_distributor(
    distributor_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DistributorRead:
    """Get a specific distributor (any logged-in user)."""
    distributor = session.get(Distributor, distributor_id)
    if not distributor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distributor not found"
        )
    return distributor
