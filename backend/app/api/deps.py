from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from typing import Optional

from app.database import get_session
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.distributor import Distributor

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
    user = session.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    return user


def get_current_distributor(
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
            detail="Distributeur non trouvé",
        )

    if not distributor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le distributeur est inactif",
        )

    return distributor


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.PLATFORM_ADMIN, UserRole.DISTRIBUTOR_ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs")
    return current_user


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs plateforme")
    return current_user


def require_distributor_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DISTRIBUTOR_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs distributeur")
    return current_user


def require_admin_or_superviseur(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.PLATFORM_ADMIN, UserRole.DISTRIBUTOR_ADMIN, UserRole.SUPERVISEUR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès non autorisé")
    return current_user
