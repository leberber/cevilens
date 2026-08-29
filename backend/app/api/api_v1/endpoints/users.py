from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User, UserCreate, UserUpdate, UserRead, UserRole
from app.core.security import hash_password
from app.api.deps import get_current_user, require_admin, require_platform_admin

router = APIRouter()


@router.get("", response_model=List[UserRead])
def list_users(
    role: Optional[UserRole] = Query(default=None),
    distributor_id: Optional[int] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    q = select(User)

    if current_user.role != UserRole.PLATFORM_ADMIN:
        q = q.where(User.distributor_id == current_user.distributor_id)
    elif distributor_id:
        q = q.where(User.distributor_id == distributor_id)

    if role:
        q = q.where(User.role == role)
    return session.exec(q.order_by(User.full_name)).all()


@router.get("/admin/all", response_model=List[UserRead])
def list_all_users_admin(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_platform_admin),
) -> Any:
    """List all users (platform admin only)."""
    return session.exec(select(User).order_by(User.full_name)).all()


@router.post("", response_model=UserRead, status_code=201)
def create_user(
    user_in: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    if current_user.role == UserRole.SUPERVISEUR:
        if user_in.role not in (UserRole.PREVENDEUR,):
            raise HTTPException(status_code=403, detail="Les superviseurs ne peuvent créer que des prevendeurs")
    elif current_user.role == UserRole.DISTRIBUTOR_ADMIN:
        # Distributor admins can only create users in their own distributor
        if user_in.distributor_id and user_in.distributor_id != current_user.distributor_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez créer des utilisateurs que dans votre distributeur")
        # Distributor admins cannot create admin-level users
        if user_in.role in (UserRole.PLATFORM_ADMIN, UserRole.DISTRIBUTOR_ADMIN):
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas créer des utilisateurs avec les rôles administrateur")
        # Auto-assign to their distributor
        user_in.distributor_id = current_user.distributor_id
    elif current_user.role != UserRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Accès refusé")

    phone = user_in.phone.replace(" ", "")
    if session.exec(select(User).where(User.phone == phone)).first():
        raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé")
    user = User(
        phone=phone,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        employe_code=user_in.employe_code,
        distributor_id=user_in.distributor_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    print(f"DEBUG UPDATE: Received data: {user_in.model_dump()}")

    # Distributor admins can only edit users in their own distributor
    if current_user.role == UserRole.DISTRIBUTOR_ADMIN:
        if user.distributor_id != current_user.distributor_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez éditer que les utilisateurs de votre distributeur")
        # Distributor admins cannot change role to admin roles
        if user_in.role and user_in.role in (UserRole.PLATFORM_ADMIN, UserRole.DISTRIBUTOR_ADMIN):
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas assigner les rôles administrateur")

    data = user_in.model_dump(exclude_unset=True)
    print(f"DEBUG UPDATE: Data after exclude_unset: {data}")
    if "phone" in data:
        data["phone"] = data["phone"].replace(" ", "")
    if "password" in data:
        data["hashed_password"] = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(user, k, v)
    session.add(user)
    session.commit()
    session.refresh(user)
    print(f"DEBUG UPDATE: After commit, user.distributor_id={user.distributor_id}")
    return user


@router.post("/bulk", response_model=List[UserRead], status_code=201)
def bulk_create_users(
    users_in: List[UserCreate],
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
) -> Any:
    created_users = []
    for user_in in users_in:
        try:
            phone = user_in.phone.replace(" ", "")
            if session.exec(select(User).where(User.phone == phone)).first():
                continue  # Skip if phone already exists
            user = User(
                phone=phone,
                full_name=user_in.full_name,
                hashed_password=hash_password(user_in.password),
                role=user_in.role,
                employe_code=user_in.employe_code,
                distributor_id=user_in.distributor_id,
            )
            session.add(user)
            session.flush()
            created_users.append(user)
        except Exception:
            continue
    session.commit()
    for user in created_users:
        session.refresh(user)
    return created_users


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
) -> None:
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    session.delete(user)
    session.commit()
