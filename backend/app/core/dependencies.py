from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from app.core.security import decode_token
from app.db import get_session
from app.models.user import User, UserRole
from app.models.distributor import Distributor


async def get_current_user(
    token: str,
    session: Session = Depends(get_session),
) -> User:
    """Extract and validate the current user from JWT token."""
    if not token.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )

    token = token[7:]  # Remove "Bearer " prefix
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = int(payload.get("sub"))
    user = session.exec(select(User).where(User.id == user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    return user


async def get_current_distributor(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Optional[Distributor]:
    """Get the distributor associated with the current user."""
    if not current_user.distributor_id:
        return None

    distributor = session.exec(
        select(Distributor).where(Distributor.id == current_user.distributor_id)
    ).first()

    if not distributor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Distributor not found",
        )

    if not distributor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Distributor is inactive",
        )

    return distributor


def require_role(*allowed_roles: UserRole):
    """Dependency to check if user has one of the allowed roles."""
    async def check_role(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return check_role


def require_distributor_access(
    current_user: User = Depends(get_current_user),
    current_distributor: Optional[Distributor] = Depends(get_current_distributor),
):
    """Dependency to ensure user belongs to a distributor (not platform admin)."""
    if not current_distributor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to a distributor",
        )
    return current_user
