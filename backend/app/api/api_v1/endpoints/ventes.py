import json
import logging
from datetime import date as date_type, datetime, timezone
from typing import Any, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

logger = logging.getLogger("app.upload")
from fastapi.responses import StreamingResponse
from sqlalchemy import func, delete as sa_delete, case as sa_case
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_current_distributor
from app.database import get_session
from app.models.user import User, UserRole
from app.models.distributor import Distributor
from app.models.vente import Vente, VentePage, VenteRead, VenteClientName
from app.utils.parse import parse_file
from app.core.security import hash_password

router = APIRouter()


def _normalize_date(d: str) -> str:
    """Accept YYYY-MM or YYYY-MM-DD, always return YYYY-MM-DD."""
    if d and len(d) == 7:
        return d + '-01'
    return d


def _extract_canal(code_fdv: Optional[str]) -> Optional[str]:
    if not code_fdv:
        return None
    upper = code_fdv.upper()
    if 'VH' in upper:
        return 'VH'
    if 'VD' in upper:
        return 'VD'
    return None


def _safe_str(val: Any, max_len: int) -> Optional[str]:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    return s[:max_len] if s else None


def _normalize_code(val: Any, max_len: int) -> Optional[str]:
    """Like _safe_str but strips the .0 suffix that pandas adds when a numeric
    column contains empty cells (int → float coercion)."""
    s = _safe_str(val, max_len)
    if s and s.endswith('.0'):
        try:
            s = str(int(float(s)))
        except (ValueError, OverflowError):
            pass
    return s


def _safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        return None if pd.isna(f) else f
    except (ValueError, TypeError):
        return None


def _safe_date(val: Any) -> Optional[Any]:
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        ts = pd.to_datetime(val, dayfirst=True)
        if pd.isna(ts):
            return None
        return ts.date()
    except Exception:
        return None


def _row_to_vente(row: pd.Series, annee_mois: str, uploaded_by_id: int, distributor_id: Optional[int] = None) -> Vente:
    date_val = row.get('Date')
    date_obj = date_val.date() if pd.notna(date_val) and hasattr(date_val, 'date') else None

    return Vente(
        annee_mois=annee_mois,
        date_commande=date_obj,
        num_commande=_safe_str(row.get('N° Commande'), 60),
        type_commande=_safe_str(row.get('Type'), 30),
        source=_safe_str(row.get('Source'), 30),
        code_client=_normalize_code(row.get('Code Client'), 50),
        nom_client=_safe_str(row.get('Nom client'), 150),
        categorie_client=_safe_str(row.get('Categories Client'), 20),
        adresse_client=_safe_str(row.get('Adresse Client'), 200),
        route=_safe_str(row.get('Route'), 50),
        commune=_safe_str(row.get('Commune'), 60),
        wilaya=_safe_str(row.get('Wilya'), 60),           # source typo
        zone=_safe_str(row.get('Zone'), 30),
        region=_safe_str(row.get('Region'), 30),
        tel_client=_safe_str(row.get('Tél'), 30),
        type_client=_safe_str(row.get('Type Client'), 20),
        code_fdv=_safe_str(row.get('Code-FDV'), 30),
        canal=_extract_canal(_safe_str(row.get('Code-FDV'), 30)),
        nom_fdv=_safe_str(row.get('Nom-FDV'), 100),
        type_fdv=_safe_str(row.get('Type-FDV'), 30),
        code_sup=_safe_str(row.get('Code-Sup'), 30),
        nom_sup=_safe_str(row.get('Nom-Sup'), 100),
        buid=_normalize_code(row.get('BUID'), 30),
        code_distributeur=_normalize_code(row.get('Code Distributeur'), 30),
        nom_distributeur=_safe_str(row.get('Nom Distributeur'), 100),
        distributor_id=distributor_id,
        depot_livraison=_safe_str(row.get('Dépôt Livraison'), 50),
        statut_commande=_safe_str(row.get('Statut Commande'), 30),
        date_creation=_safe_date(row.get('Date Création')),
        date_confirmation=_safe_date(row.get('Date Confirmation')),
        date_facturation=_safe_date(row.get('Date Facturation')),
        code_livreur=_normalize_code(row.get('Code Livreur'), 30),
        nom_livreur=_safe_str(row.get('Nom Livreur'), 100),
        matricule_van=_safe_str(row.get('Matricule VAN'), 30),
        code_produit=_normalize_code(row.get('Code Produit'), 30),
        description_produit=_safe_str(row.get('Description Produit'), 200),
        famille=_safe_str(row.get('Famille'), 50),
        sous_famille=_safe_str(row.get('Sous Famille'), 80),
        uom_vente=_safe_str(row.get('UOM Vente'), 20),
        cout_produit=_safe_float(row.get('Cout Produit')),
        prix_unitaire=_safe_float(row.get('Prix Unitaire')),
        uom_principale=_safe_str(row.get('UOM principale'), 20),
        prix_unitaire_uom_pr=_safe_float(row.get('Prix unitaire UOM PR')),
        qte_commandee=_safe_float(row.get('Qte Commandée')),
        qte_chargee=_safe_float(row.get('Qte Chargée')),
        qte_livree=_safe_float(row.get('Qte Livrée')),
        qte_facturee=_safe_float(row.get('Qte  Facturée')),    # double space
        total_commande=_safe_float(row.get('Total Commandée')),
        total_facture=_safe_float(row.get('Total  Facturée')), # double space
        total_remise=_safe_float(row.get('Total Remise')),
        gratuite=_safe_float(row.get('Gratuité')),
        uploaded_by_id=uploaded_by_id,
    )


_FILTERABLE_FIELDS = {
    'sous_famille', 'type_commande', 'categorie_client', 'statut_commande',
    'wilaya', 'zone', 'region', 'type_client',
    'source', 'canal', 'route', 'nom_fdv', 'nom_livreur', 'famille', 'nom_distributeur', 'nom_client',
}


@router.get("", response_model=VentePage)
def list_ventes(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    annee_mois: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    famille: Optional[str] = Query(default=None),
    sous_famille: Optional[str] = Query(default=None),
    type_commande: Optional[str] = Query(default=None),
    categorie_client: Optional[str] = Query(default=None),
    statut_commande: Optional[str] = Query(default=None),
    wilaya: Optional[str] = Query(default=None),
    zone: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    canal: Optional[str] = Query(default=None),
    route: Optional[str] = Query(default=None),
    nom_fdv: Optional[str] = Query(default=None),
    nom_livreur: Optional[str] = Query(default=None),
    nom_distributeur: Optional[str] = Query(default=None),
    nom_client: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    conditions = []
    # Filter by distributor for non-platform-admin users
    # Include rows where distributor_id is NULL (backward compatibility) or matches current distributor
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        conditions.append(
            (Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None)
        )

    if annee_mois:
        conditions.append(Vente.annee_mois == annee_mois)
    if date_from:
        conditions.append(Vente.date_commande >= date_type.fromisoformat(_normalize_date(date_from)))
    if date_to:
        conditions.append(Vente.date_commande <= date_type.fromisoformat(_normalize_date(date_to)))
    if famille:
        conditions.append(Vente.famille == famille)
    if sous_famille:
        conditions.append(Vente.sous_famille == sous_famille)
    if type_commande:
        conditions.append(Vente.type_commande == type_commande)
    if categorie_client:
        conditions.append(Vente.categorie_client == categorie_client)
    if statut_commande:
        conditions.append(Vente.statut_commande == statut_commande)
    if wilaya:
        conditions.append(Vente.wilaya == wilaya)
    if zone:
        conditions.append(Vente.zone == zone)
    if region:
        conditions.append(Vente.region == region)
    if source:
        conditions.append(Vente.source == source)
    if canal:
        conditions.append(Vente.canal == canal)
    if route:
        conditions.append(Vente.route == route)
    if nom_livreur:
        conditions.append(Vente.nom_livreur == nom_livreur)
    if nom_fdv:
        conditions.append(Vente.nom_fdv == nom_fdv)
    if nom_distributeur:
        conditions.append(Vente.nom_distributeur == nom_distributeur)
    if nom_client:
        conditions.append(Vente.nom_client == nom_client)
    if search:
        term = f"%{search}%"
        conditions.append(
            Vente.nom_client.ilike(term) |
            Vente.description_produit.ilike(term) |
            Vente.num_commande.ilike(term)
        )

    count_q = select(func.count(Vente.id))
    items_q = select(Vente)
    for c in conditions:
        count_q = count_q.where(c)
        items_q = items_q.where(c)

    total = session.exec(count_q).one()
    offset = (page - 1) * per_page
    items = session.exec(
        items_q.order_by(Vente.date_commande.desc()).offset(offset).limit(per_page)
    ).all()

    return VentePage(
        total=total,
        items=[VenteRead.model_validate(v) for v in items],
    )


@router.get("/periodes", response_model=List[str])
def list_periodes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    q = select(Vente.annee_mois).distinct().order_by(Vente.annee_mois.desc())
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        q = q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    result = session.exec(q).all()
    return list(result)


@router.get("/date-range")
def get_date_range(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    q_min = select(func.min(Vente.date_commande))
    q_max = select(func.max(Vente.date_commande))
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        filter_cond = (Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None)
        q_min = q_min.where(filter_cond)
        q_max = q_max.where(filter_cond)
    min_date = session.exec(q_min).one()
    max_date = session.exec(q_max).one()
    return {
        "min_date": str(min_date) if min_date else None,
        "max_date": str(max_date) if max_date else None,
    }


@router.get("/fdvs", response_model=List[str])
def list_fdvs(
    annee_mois: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    q = select(Vente.nom_fdv).distinct().order_by(Vente.nom_fdv)
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        q = q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if annee_mois:
        q = q.where(Vente.annee_mois == annee_mois)
    if date_from:
        q = q.where(Vente.date_commande >= date_type.fromisoformat(_normalize_date(date_from)))
    if date_to:
        q = q.where(Vente.date_commande <= date_type.fromisoformat(_normalize_date(date_to)))
    return [v for v in session.exec(q).all() if v]


@router.get("/familles", response_model=List[str])
def list_familles(
    annee_mois: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    q = select(Vente.famille).distinct().order_by(Vente.famille)
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        q = q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if annee_mois:
        q = q.where(Vente.annee_mois == annee_mois)
    if date_from:
        q = q.where(Vente.date_commande >= date_type.fromisoformat(_normalize_date(date_from)))
    if date_to:
        q = q.where(Vente.date_commande <= date_type.fromisoformat(_normalize_date(date_to)))
    return [v for v in session.exec(q).all() if v]


@router.get("/distinct/{field}", response_model=List[str])
def list_distinct(
    field: str,
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    from fastapi import HTTPException
    if field not in _FILTERABLE_FIELDS:
        raise HTTPException(status_code=400, detail=f"Field '{field}' not filterable")

    # Use fast lookup table for client names
    if field == 'nom_client':
        q = select(VenteClientName.nom_client).distinct().order_by(VenteClientName.nom_client)
        if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
            q = q.where(
                (VenteClientName.distributor_id == current_distributor.id) |
                (VenteClientName.distributor_id == None)
            )
        if search:
            q = q.where(VenteClientName.nom_client.ilike(f"%{search}%"))
        return [v for v in session.exec(q).all() if v]

    # Standard DISTINCT query for other fields
    col = getattr(Vente, field)
    q = select(col).distinct().order_by(col)
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        q = q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if date_from:
        q = q.where(Vente.date_commande >= date_type.fromisoformat(_normalize_date(date_from)))
    if date_to:
        q = q.where(Vente.date_commande <= date_type.fromisoformat(_normalize_date(date_to)))
    if search:
        q = q.where(col.ilike(f"%{search}%"))
    return [v for v in session.exec(q).all() if v]


@router.get("/clients", response_model=List[str])
def list_clients(
    annee_mois: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    nom_fdv: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    q = select(Vente.nom_client).distinct().order_by(Vente.nom_client)
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        q = q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if annee_mois:
        q = q.where(Vente.annee_mois == annee_mois)
    if date_from:
        q = q.where(Vente.date_commande >= date_type.fromisoformat(_normalize_date(date_from)))
    if date_to:
        q = q.where(Vente.date_commande <= date_type.fromisoformat(_normalize_date(date_to)))
    if nom_fdv:
        q = q.where(Vente.nom_fdv == nom_fdv)
    return [v for v in session.exec(q).all() if v]


@router.get("/client-names", response_model=List[str])
def list_client_names(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
) -> Any:
    """Fast lookup: return all client names for current distributor (no search filtering)."""
    q = select(VenteClientName.nom_client).distinct().order_by(VenteClientName.nom_client)
    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
        q = q.where(
            (VenteClientName.distributor_id == current_distributor.id) |
            (VenteClientName.distributor_id == None)
        )
    return [v for v in session.exec(q).all() if v]


@router.post("/upload")
async def upload_ventes(
    file: UploadFile = File(...),
    mode: Optional[str] = Query(default=None),  # 'skip' | 'replace'
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    # Only PLATFORM_ADMIN, DISTRIBUTOR_ADMIN, and SUPERVISEUR can upload
    if current_user.role not in (UserRole.PLATFORM_ADMIN, UserRole.DISTRIBUTOR_ADMIN, UserRole.SUPERVISEUR):
        raise HTTPException(status_code=403, detail="Accès refusé")

    content = await file.read()
    filename = file.filename or ''

    def event(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    def generate():
        logger.info(f"Upload démarré : {filename} par {current_user.full_name} ({len(content) // 1024} KB)")
        yield event({"progress": 5, "message": "Lecture du fichier..."})

        try:
            df = parse_file(content, filename)
        except Exception as e:
            logger.error(f"Upload échoué (lecture fichier) : {filename} — {e}")
            yield event({"error": f"Impossible de lire le fichier : {e}"})
            return

        df = df.dropna(subset=['Date'])
        if df.empty:
            yield event({"error": "Aucune ligne valide trouvée dans le fichier"})
            return

        total_rows = len(df)
        date_min = df['Date'].min().strftime('%d/%m/%Y')
        date_max = df['Date'].max().strftime('%d/%m/%Y')
        yield event({
            "progress": 15,
            "message": f"{total_rows:,} lignes trouvées...",
            "file_info": {"total_rows": total_rows, "date_min": date_min, "date_max": date_max},
        })

        # Date overlap check
        file_dates = list({d for d in df['Date'].dt.date if d is not None})
        existing_dates = set(session.exec(
            select(Vente.date_commande)
            .where(Vente.date_commande.in_(file_dates))
            .distinct()
        ).all())
        existing_dates.discard(None)

        if existing_dates and mode is None:
            overlap_sorted = sorted(existing_dates)
            yield event({
                "type": "overlap",
                "overlap_min": overlap_sorted[0].strftime('%d/%m/%Y'),
                "overlap_max": overlap_sorted[-1].strftime('%d/%m/%Y'),
                "overlap_count": len(overlap_sorted),
            })
            return

        if mode == 'replace' and existing_dates:
            yield event({"progress": 20, "message": "Suppression des données existantes..."})
            session.exec(sa_delete(Vente).where(Vente.date_commande.in_(list(existing_dates))))
            session.commit()
        elif mode == 'skip' and existing_dates:
            df = df[~df['Date'].dt.date.isin(existing_dates)]
            if df.empty:
                yield event({"error": "Toutes les dates sont déjà présentes dans la base"})
                return

        yield event({"progress": 25, "message": "Extraction du distributeur..."})

        # Extract distributor info from data (use first non-null value)
        dist_code = None
        dist_nom = None
        for _, row in df.iterrows():
            if pd.notna(row.get('Code Distributeur')) and pd.notna(row.get('Nom Distributeur')):
                dist_code = _normalize_code(row.get('Code Distributeur'), 30)
                dist_nom = _safe_str(row.get('Nom Distributeur'), 100)
                break

        if not dist_code or not dist_nom:
            yield event({"error": "Impossible de trouver 'Code Distributeur' et 'Nom Distributeur' dans le fichier"})
            return

        # Check if distributor exists, create if not
        distributor = session.exec(
            select(Distributor).where(Distributor.code == dist_code)
        ).first()

        if not distributor:
            yield event({"progress": 26, "message": f"Création du distributeur: {dist_nom}..."})
            distributor = Distributor(code=dist_code, nom=dist_nom, is_active=True)
            session.add(distributor)
            session.flush()

        distributor_id = distributor.id

        # Security check: DISTRIBUTOR_ADMIN and SUPERVISEUR can only upload for their own distributor
        if current_user.role in (UserRole.DISTRIBUTOR_ADMIN, UserRole.SUPERVISEUR):
            if distributor_id != current_user.distributor_id:
                yield event({"error": "Vous ne pouvez importer des données que pour votre distributeur"})
                return
        yield event({"progress": 28, "message": f"Distributeur: {distributor.nom}"})

        yield event({"progress": 30, "message": "Préparation des enregistrements..."})

        total = len(df)
        if total == 0:
            yield event({"error": "Aucune ligne valide à insérer"})
            return

        BATCH = 500
        inserted = 0
        clients_to_sync = {}  # code_client -> nom_client
        for batch_start in range(0, total, BATCH):
            batch_df = df.iloc[batch_start:batch_start + BATCH]
            batch_ventes = []
            for _, row in batch_df.iterrows():
                date_val = row.get('Date')
                if pd.isna(date_val):
                    continue
                row_month = date_val.strftime('%Y-%m')
                batch_ventes.append(_row_to_vente(row, row_month, current_user.id, distributor_id))

                # Collect client codes and names for lookup table
                code_client = _normalize_code(row.get('Code Client'), 50)
                nom_client = _safe_str(row.get('Nom client'), 150)
                if code_client and nom_client:
                    clients_to_sync[code_client] = nom_client

            session.add_all(batch_ventes)
            session.flush()
            del batch_ventes
            inserted += len(batch_df)
            progress = 30 + int(65 * inserted / total)
            yield event({
                "progress": progress,
                "message": f"{inserted:,} / {total:,} lignes insérées...",
            })

        # Upsert into VenteClientName lookup table
        for code_client, nom_client in clients_to_sync.items():
            existing = session.exec(
                select(VenteClientName).where(
                    (VenteClientName.code_client == code_client) &
                    (VenteClientName.distributor_id == distributor_id)
                )
            ).first()
            if existing:
                existing.nom_client = nom_client
                existing.updated_at = datetime.now(timezone.utc)
                session.add(existing)
            else:
                session.add(VenteClientName(
                    code_client=code_client,
                    nom_client=nom_client,
                    distributor_id=distributor_id
                ))

        session.commit()

        dominant_month = df['Date'].dt.strftime('%Y-%m').value_counts().idxmax()
        msg = f"{total:,} lignes importées avec succès"
        log_line = f"Upload terminé : {total:,} lignes importées ({dominant_month}) par {current_user.full_name}"

        # Check for FDV codes in the file that have no user account
        fdv_in_file = df[['Code-FDV', 'Nom-FDV', 'Nom Distributeur']].dropna(subset=['Code-FDV']).drop_duplicates('Code-FDV')
        existing_codes = set(session.exec(
            select(User.employe_code).where(User.employe_code != None)
        ).all())
        missing_fdvs = [
            {
                "code": _safe_str(row['Code-FDV'], 30),
                "nom": _safe_str(row['Nom-FDV'], 100),
                "nom_distributeur": _safe_str(row['Nom Distributeur'], 100)
            }
            for _, row in fdv_in_file.iterrows()
            if _safe_str(row['Code-FDV'], 30) not in existing_codes
        ]

        # Auto-create prevendeur accounts for missing FDVs
        created_count = 0
        for fdv in missing_fdvs:
            try:
                code = fdv['code']
                # Check if phone (code) is already in use
                if not session.exec(select(User).where(User.phone == code)).first():
                    user = User(
                        phone=code,
                        full_name=fdv['nom'],
                        hashed_password=hash_password(code),
                        role=UserRole.PREVENDEUR,
                        employe_code=code,
                        nom_distributeur=fdv['nom_distributeur'],
                        distributor_id=distributor_id,
                    )
                    session.add(user)
                    created_count += 1
            except Exception as e:
                logger.warning(f"Failed to create prevendeur {fdv['code']}: {e}")
                continue

        if created_count > 0:
            session.commit()
            msg += f" • {created_count} prévendeur(s) créé(s)"
            logger.info(f"Créé {created_count} comptes prévendeurs")

        del df
        logger.info(log_line)
        yield event({
            "progress": 100,
            "done": True,
            "message": msg,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
