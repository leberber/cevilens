from typing import Any, List, Optional
from collections import defaultdict
from datetime import datetime, timezone
from io import BytesIO

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, case as sa_case, text
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_current_distributor
from app.core.product_codes import remap_by_vente_code
from app.core.uom_conversion import PRODUITS_JOIN, qty_expr
from app.database import get_session
from app.models.user import User, UserRole
from app.models.vente import Vente
from app.models.objectif import Objectif

router = APIRouter()


@router.get("/periodes", response_model=List[str])
def prevendeur_periodes(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Any:
    if not current_user.employe_code:
        return []
    rows = session.exec(
        select(Vente.annee_mois)
        .distinct()
        .where(Vente.code_fdv == current_user.employe_code)
        .order_by(Vente.annee_mois.desc())
    ).all()
    return list(rows)


@router.get("/facturation")
def prevendeur_facturation(
    annee_mois: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Any:
    if not current_user.employe_code:
        return {"fdv_nom": "", "periode": annee_mois, "routes": [], "products": [], "products_meta": {}, "total_clients": 0}

    rows = session.exec(
        select(Vente)
        .where(Vente.code_fdv == current_user.employe_code)
        .where(Vente.annee_mois == annee_mois)
        .where(Vente.famille.ilike('sucre') | Vente.famille.ilike('huile'))
    ).all()

    # Exclude explicit BackOffice rows
    rows = [r for r in rows if r.source != 'BackOffice']

    if not rows:
        return {"fdv_nom": current_user.full_name, "periode": annee_mois, "routes": [], "products": [], "products_meta": {}, "total_clients": 0}

    # Use Vente data directly since Produit model was removed
    code_to_label = {r.code_produit: (r.description_produit or f"Code {r.code_produit}") for r in rows if r.code_produit}

    # Filter by available vente data (facturable flag no longer available)
    # rows = [r for r in rows if r.code_produit and r.code_produit in code_to_label]

    def display_label(r: Vente) -> str:
        if r.code_produit and r.code_produit in code_to_label and code_to_label[r.code_produit]:
            return code_to_label[r.code_produit]
        return r.description_produit or ''

    products = sorted({display_label(r) for r in rows if r.description_produit})

    # Build meta map from Vente data only (Produit model removed)
    label_meta: dict = {}
    for r in rows:
        label = display_label(r)
        if label not in label_meta:
            famille = (r.famille or '').lower()
            label_meta[label] = {"uom_vente": r.uom_vente, "colisage": None, "famille": famille, "prix": None}
    products_meta = {p: label_meta.get(p, {"uom_vente": None, "colisage": None, "famille": None, "prix": None}) for p in products}

    # Aggregate: client -> date_label -> product -> qty
    agg: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    client_meta: dict = {}

    for r in rows:
        if not r.nom_client or not r.description_produit or not r.date_commande:
            continue
        label = r.date_commande.strftime('%d/%m/%y')
        agg[r.nom_client][label][display_label(r)] += r.qte_facturee or 0
        if r.nom_client not in client_meta:
            client_meta[r.nom_client] = {
                'code_client': r.code_client,
                'route': r.route or 'Sans route',
            }

    all_dates = sorted({r.date_commande for r in rows if r.date_commande})
    date_labels = [d.strftime('%d/%m/%y') for d in all_dates]

    # Group clients by route
    route_clients: dict = defaultdict(list)
    for nom, meta in sorted(client_meta.items()):
        route_clients[meta['route']].append(nom)

    fdv_nom = rows[0].nom_fdv if rows else current_user.full_name

    # Client metadata
    nom_sodichn_map = {}

    routes_out = []
    for route in sorted(route_clients.keys()):
        clients_out = []
        for nom in route_clients[route]:
            client_dates = [l for l in date_labels if any(agg[nom][l][p] for p in products)]
            if not client_dates:
                continue
            semaines = {
                l: {p: (agg[nom][l][p] if agg[nom][l][p] else None) for p in products}
                for l in client_dates
            }
            totaux = {p: (sum(agg[nom][l][p] for l in client_dates) or None) for p in products}
            code = client_meta[nom]['code_client']
            clients_out.append({
                "nom_client": nom,
                "code_client": code,
                "nom_sodichn": nom_sodichn_map.get(code),
                "derniere_visite": client_dates[-1],
                "weeks": client_dates,
                "semaines": semaines,
                "totaux": totaux,
            })
        if clients_out:
            routes_out.append({"route": route, "clients": clients_out})

    return {
        "fdv_nom": fdv_nom,
        "periode": annee_mois,
        "products": products,
        "products_meta": products_meta,
        "total_clients": sum(len(r["clients"]) for r in routes_out),
        "routes": routes_out,
    }


@router.get("/admin/stats")
def prevendeur_admin_stats(
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    q = select(User).where(User.role == UserRole.PREVENDEUR).where(User.is_active == True)
    if current_distributor:
        q = q.where(User.distributor_id == current_distributor.id)
    prevendeurs = session.exec(q.order_by(User.full_name)).all()

    fdv_codes = [pv.employe_code for pv in prevendeurs if pv.employe_code]
    if not fdv_codes:
        return []

    # 1 query: all distinct (code_fdv, code_client, nom_client) across all prevendeurs
    vente_rows = session.exec(
        select(Vente.code_fdv, Vente.code_client, Vente.nom_client)
        .distinct()
        .where(Vente.code_fdv.in_(fdv_codes), Vente.code_client.isnot(None))
    ).all()

    fdv_clients: dict = defaultdict(list)   # code_fdv -> [(code_client, nom_client)]
    all_client_codes: set = set()
    for code_fdv, code_client, nom_client in vente_rows:
        fdv_clients[code_fdv].append((code_client, nom_client))
        all_client_codes.add(code_client)

    # 1 query: last sale date per prevendeur
    last_sale_rows = session.exec(
        select(Vente.code_fdv, func.max(Vente.date_commande))
        .where(Vente.code_fdv.in_(fdv_codes))
        .group_by(Vente.code_fdv)
    ).all()
    last_sale_map = {code_fdv: last_sale for code_fdv, last_sale in last_sale_rows}

    # Client metadata
    sodichn_map: dict = {}   # customer_no -> {nom_sodichn, updated_at}

    today = datetime.now(timezone.utc).date()

    result = []
    for pv in prevendeurs:
        if not pv.employe_code:
            continue
        clients = fdv_clients.get(pv.employe_code, [])
        total_clients = len(clients)

        # Per-client stats
        updated_today = 0
        last_sodichn_date = None
        matched = 0
        clients_detail = []

        for code, nom in sorted(clients, key=lambda x: x[1] or ''):
            info = sodichn_map.get(code, {})
            nom_sodichn = info.get("nom_sodichn")
            updated_at = info.get("updated_at")
            if nom_sodichn:
                matched += 1
            if updated_at and nom_sodichn:
                updated_date = updated_at.date() if hasattr(updated_at, 'date') else updated_at
                if updated_date == today:
                    updated_today += 1
                if last_sodichn_date is None or updated_date > last_sodichn_date:
                    last_sodichn_date = updated_date
            clients_detail.append({
                "code_client": code,
                "nom_client": nom,
                "nom_sodichn": nom_sodichn,
                "updated_at": updated_at.strftime('%Y-%m-%d') if updated_at else None,
            })

        # Count updated on last active day
        updated_on_last_day = 0
        if last_sodichn_date:
            updated_on_last_day = sum(
                1 for c in clients_detail
                if c["updated_at"] and c["updated_at"][:10] == last_sodichn_date.strftime('%Y-%m-%d')
            )

        last_sale = last_sale_map.get(pv.employe_code)
        result.append({
            "id": pv.id,
            "full_name": pv.full_name,
            "employe_code": pv.employe_code,
            "total_clients": total_clients,
            "clients_with_sodichn": matched,
            "remaining": total_clients - matched,
            "completion_pct": round(matched / total_clients * 100) if total_clients > 0 else 0,
            "updated_today": updated_today,
            "last_sodichn_date": last_sodichn_date.strftime('%Y-%m-%d') if last_sodichn_date else None,
            "updated_on_last_day": updated_on_last_day,
            "last_activity": last_sale.strftime('%Y-%m-%d') if last_sale else None,
            "clients": clients_detail,
        })

    return result


@router.get("/admin/stats/export")
def export_clients_excel(
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
    session: Session = Depends(get_session),
):
    q = select(User).where(User.role == UserRole.PREVENDEUR).where(User.is_active == True)
    if current_distributor:
        q = q.where(User.distributor_id == current_distributor.id)
    prevendeurs = session.exec(q.order_by(User.full_name)).all()

    fdv_codes = [pv.employe_code for pv in prevendeurs if pv.employe_code]
    if not fdv_codes:
        return StreamingResponse(BytesIO(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    vente_rows = session.exec(
        select(Vente.code_fdv, Vente.code_client, Vente.nom_client)
        .distinct()
        .where(Vente.code_fdv.in_(fdv_codes), Vente.code_client.isnot(None))
    ).all()

    fdv_clients: dict = defaultdict(list)
    all_client_codes: set = set()
    for code_fdv, code_client, nom_client in vente_rows:
        fdv_clients[code_fdv].append((code_client, nom_client))
        all_client_codes.add(code_client)

    sodichn_map: dict = {}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Clients RC"

    # Styles
    header_font = Font(bold=True, color="FFFFFF", size=10)
    header_fill = PatternFill("solid", fgColor="2563EB")
    fdv_font = Font(bold=True, size=10)
    fdv_fill = PatternFill("solid", fgColor="DBEAFE")
    thin = Side(style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal="center", vertical="center")

    headers = ["Prévendeur", "Code FDV", "Code Client", "Nom Client", "Nom RC (Sodichn)", "Statut", "Mis à jour le"]
    col_widths = [28, 14, 14, 32, 32, 12, 16]

    for col, (header, width) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border
        ws.column_dimensions[get_column_letter(col)].width = width

    ws.row_dimensions[1].height = 22

    row_num = 2
    today = datetime.now(timezone.utc).date()

    for pv in prevendeurs:
        if not pv.employe_code:
            continue
        clients = fdv_clients.get(pv.employe_code, [])
        for code, nom in sorted(clients, key=lambda x: x[1] or ''):
            info = sodichn_map.get(code, {})
            nom_sodichn = info.get("nom_sodichn") or ""
            updated_at = info.get("updated_at")
            statut = "✓ Complété" if nom_sodichn else "— Vide"
            updated_str = updated_at.strftime('%Y-%m-%d') if updated_at else ""

            row_data = [pv.full_name, pv.employe_code, code, nom, nom_sodichn, statut, updated_str]
            for col, value in enumerate(row_data, 1):
                cell = ws.cell(row=row_num, column=col, value=value)
                cell.border = border
                cell.font = Font(size=9)
                if col == 6:
                    cell.alignment = center
                    if nom_sodichn:
                        cell.font = Font(size=9, color="16A34A", bold=True)
                    else:
                        cell.font = Font(size=9, color="9CA3AF")

            row_num += 1

    ws.freeze_panes = "A2"

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"clients_rc_{datetime.now(timezone.utc).strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/admin/drilldown")
def prevendeur_admin_drilldown(
    annee_mois: str = Query(...),
    code_fdv: Optional[str] = Query(None),
    canal: Optional[str] = Query(None),   # "VD" or "VH"
    nom_distributeur: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    q_periods = select(Vente.annee_mois).distinct().order_by(Vente.annee_mois.desc())
    if current_distributor:
        q_periods = q_periods.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    all_periods = session.exec(q_periods).all()
    all_periods_list = list(all_periods)

    # Prevendeurs list with their totals for the current period (always unfiltered)
    q_pv = select(User).where(User.role == UserRole.PREVENDEUR).where(User.is_active == True)
    if current_distributor:
        q_pv = q_pv.where(User.distributor_id == current_distributor.id)
    prevendeurs_db = session.exec(q_pv.order_by(User.full_name)).all()
    fdv_name_map = {p.employe_code: p.full_name for p in prevendeurs_db if p.employe_code}

    _norm = Vente.qte_facturee

    fdv_totals_q = (
        select(Vente.code_fdv, func.sum(_norm))
        .where(Vente.annee_mois == annee_mois)
        .where(Vente.statut_commande == 'Facturé')
        .where(Vente.code_fdv.isnot(None))
        .group_by(Vente.code_fdv)
    )
    if current_distributor:
        fdv_totals_q = fdv_totals_q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if canal:
        fdv_totals_q = fdv_totals_q.where(Vente.canal == canal)
    if nom_distributeur:
        fdv_totals_q = fdv_totals_q.where(Vente.nom_distributeur == nom_distributeur)
    fdv_totals = {row[0]: round(row[1] or 0) for row in session.exec(fdv_totals_q).all()}

    canal_upper = canal.upper() if canal else None

    # Previous period — use the previous available period in the data (not necessarily month-1)
    try:
        cur_idx = all_periods_list.index(annee_mois)
    except ValueError:
        cur_idx = 0
    prev_periode = all_periods_list[cur_idx + 1] if cur_idx + 1 < len(all_periods_list) else None
    trend_periods = list(reversed(all_periods_list[cur_idx: cur_idx + 6]))  # chronological

    def fetch_rows(periode: str) -> list:
        q = select(
            Vente.date_commande,
            Vente.famille,
            Vente.sous_famille,
            Vente.code_produit,
            Vente.description_produit,
            _norm.label('qty_norm'),
            Vente.code_fdv,
            Vente.nom_fdv,
            Vente.source,
        ).where(
            Vente.annee_mois == periode, Vente.statut_commande == 'Facturé'
        )
        if current_distributor:
            q = q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
        if code_fdv:
            q = q.where(Vente.code_fdv == code_fdv)
        if canal:
            q = q.where(Vente.canal == canal)
        if nom_distributeur:
            q = q.where(Vente.nom_distributeur == nom_distributeur)
        return list(session.exec(q).all())

    rows = fetch_rows(annee_mois)
    prev_rows = fetch_rows(prev_periode) if prev_periode else []

    period_totals: dict = defaultdict(float)
    if trend_periods:
        q6 = (
            select(Vente.annee_mois, func.sum(_norm))
            .where(Vente.annee_mois.in_(trend_periods))
            .where(Vente.statut_commande == 'Facturé')
        )
        if current_distributor:
            q6 = q6.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
        if code_fdv:
            q6 = q6.where(Vente.code_fdv == code_fdv)
        if canal:
            q6 = q6.where(Vente.canal == canal)
        if nom_distributeur:
            q6 = q6.where(Vente.nom_distributeur == nom_distributeur)
        q6 = q6.group_by(Vente.annee_mois)
        for periode, total in session.exec(q6).all():
            period_totals[periode] = total or 0

    trend_6m = [round(period_totals.get(p, 0)) for p in trend_periods]
    trend_6m_labels = trend_periods

    # Product label resolution — Produit model removed, use description_produit from Vente
    codes = {r.code_produit for r in rows if r.code_produit}
    code_to_produit = {}  # No Produit model available

    def week_idx(d) -> int:
        if d is None:
            return 0
        day = d.day
        if day <= 7: return 0
        if day <= 14: return 1
        if day <= 21: return 2
        return 3

    def product_label(r: Vente) -> str:
        return r.description_produit or "Autre"

    # famille -> sous_famille -> produit -> [w0,w1,w2,w3]
    hier: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: [0.0] * 4)))
    # famille -> code_fdv -> total
    fdv_by_famille: dict = defaultdict(lambda: defaultdict(float))
    prev_famille_total: dict = defaultdict(float)
    # famille -> sf -> produit -> code_fdv -> total (for per-product FDV panel)
    fdv_by_sf_prod: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(float))))
    # product label -> code_produit (first seen)
    prod_label_to_code: dict = {}

    for r in rows:
        if not r.date_commande or not r.qty_norm:
            continue
        famille = (r.famille or "").strip().lower()
        sf = (r.sous_famille or "Autres").strip()
        prod = product_label(r)
        w = week_idx(r.date_commande)
        hier[famille][sf][prod][w] += r.qty_norm
        if r.code_produit and prod not in prod_label_to_code:
            prod_label_to_code[prod] = r.code_produit
        if r.code_fdv:
            fdv_by_famille[famille][r.code_fdv] += r.qty_norm
            fdv_by_sf_prod[famille][sf][prod][r.code_fdv] += r.qty_norm
        # Supplement fdv name map from row data
        if r.code_fdv and r.nom_fdv and r.code_fdv not in fdv_name_map:
            fdv_name_map[r.code_fdv] = r.nom_fdv

    for r in prev_rows:
        if not r.qty_norm:
            continue
        famille = (r.famille or "").strip().lower()
        prev_famille_total[famille] += r.qty_norm

    # Objective aggregation for this period
    annee_int, mois_int = int(annee_mois.split('-')[0]), int(annee_mois.split('-')[1])

    # Per-product objectives (total + per-tournée)
    obj_prod_rows = session.exec(
        select(
            Objectif.code_produit,
            Objectif.objectif_packs_vd, Objectif.objectif_packs_vh,
            Objectif.objectif_packs_vd_tournee, Objectif.objectif_packs_vh_tournee,
            Objectif.objectif_tonne_vd, Objectif.objectif_tonne_vh,
        )
        .where(Objectif.mois == mois_int, Objectif.annee == annee_int)
    ).all()
    if canal == 'VD':
        obj_by_prod       = {r.code_produit: r.objectif_packs_vd_tournee for r in obj_prod_rows}
        obj_by_prod_total = {r.code_produit: r.objectif_packs_vd for r in obj_prod_rows}
        obj_tonne_by_prod = {r.code_produit: r.objectif_tonne_vd for r in obj_prod_rows}
    elif canal == 'VH':
        obj_by_prod       = {r.code_produit: r.objectif_packs_vh_tournee for r in obj_prod_rows}
        obj_by_prod_total = {r.code_produit: r.objectif_packs_vh for r in obj_prod_rows}
        obj_tonne_by_prod = {r.code_produit: r.objectif_tonne_vh for r in obj_prod_rows}
    else:
        obj_by_prod       = {r.code_produit: (r.objectif_packs_vd_tournee or 0) + (r.objectif_packs_vh_tournee or 0) for r in obj_prod_rows}
        obj_by_prod_total = {r.code_produit: (r.objectif_packs_vd or 0) + (r.objectif_packs_vh or 0) for r in obj_prod_rows}
        obj_tonne_by_prod = {r.code_produit: (r.objectif_tonne_vd or 0) + (r.objectif_tonne_vh or 0) for r in obj_prod_rows}

    # Remap objective codes (may be code_dd) → vente codes so sales lookups match
    obj_by_prod       = remap_by_vente_code(obj_by_prod, session)
    obj_by_prod_total = remap_by_vente_code(obj_by_prod_total, session)
    obj_tonne_by_prod = remap_by_vente_code(obj_tonne_by_prod, session)

    # When a single FDV is selected, display per-route targets instead of global totals
    if code_fdv:
        obj_by_prod_total = obj_by_prod

    # Zero-sale objective products — Produit model removed, skip supplementation
    # Only include products that appear in the sales data (via ventes)
    codes_in_hier = set(prod_label_to_code.values())

    # Per-route total: sum of all tournée targets (derived from obj_by_prod, no extra query)
    objectif_per_route = round(sum(v for v in obj_by_prod.values() if v))

    # Per-fdv per-product sales — queried without code_fdv filter so all pills stay accurate
    _fdv_prod_q = (
        select(Vente.code_fdv, Vente.code_produit, func.sum(_norm))
        .where(Vente.annee_mois == annee_mois, Vente.statut_commande == 'Facturé', Vente.code_fdv.isnot(None), Vente.code_produit.isnot(None))
    )
    if current_distributor:
        _fdv_prod_q = _fdv_prod_q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if canal:
        _fdv_prod_q = _fdv_prod_q.where(Vente.canal == canal)
    _fdv_prod_q = _fdv_prod_q.group_by(Vente.code_fdv, Vente.code_produit)

    fdv_prod_totals: dict = defaultdict(lambda: defaultdict(float))
    for _fdv, _prod, _tot in session.exec(_fdv_prod_q).all():
        fdv_prod_totals[_fdv][_prod] = _tot or 0.0

    def compute_achievement_pct(code_fdv: str):
        """Simple average of per-product achievement rates for this prevendeur."""
        rates = []
        prod_sales = fdv_prod_totals.get(code_fdv, {})
        for code_prod, obj in obj_by_prod.items():
            if not obj:
                continue
            sales = prod_sales.get(code_prod, 0.0)
            rates.append(min(sales / obj * 100, 100.0))
        if not rates:
            return None
        return round(sum(rates) / len(rates))

    prevendeurs_out = sorted(
        [
            {
                "code": code,
                "nom": fdv_name_map.get(code, code),
                "total": total,
                "achievement_pct": compute_achievement_pct(code),
            }
            for code, total in fdv_totals.items()
            if not canal_upper or canal_upper in code.upper()
        ],
        key=lambda x: x["nom"],
    )

    # CA (chiffre d'affaires) per famille — SUM(qte_facturee * prix_unitaire)
    _ca_q = (
        select(Vente.famille, func.sum(Vente.qte_facturee * Vente.prix_unitaire))
        .where(Vente.annee_mois == annee_mois, Vente.statut_commande == 'Facturé')
        .where(Vente.prix_unitaire.isnot(None))
        .group_by(Vente.famille)
    )
    if current_distributor:
        _ca_q = _ca_q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    if code_fdv:
        _ca_q = _ca_q.where(Vente.code_fdv == code_fdv)
    if canal:
        _ca_q = _ca_q.where(Vente.canal == canal)
    ca_by_famille = {(r[0] or '').strip().lower(): round(r[1] or 0) for r in session.exec(_ca_q).all()}

    if prev_periode:
        _ca_prev_q = (
            select(Vente.famille, func.sum(Vente.qte_facturee * Vente.prix_unitaire))
            .where(Vente.annee_mois == prev_periode, Vente.statut_commande == 'Facturé')
            .where(Vente.prix_unitaire.isnot(None))
            .group_by(Vente.famille)
        )
        if current_distributor:
            _ca_prev_q = _ca_prev_q.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
        if code_fdv:
            _ca_prev_q = _ca_prev_q.where(Vente.code_fdv == code_fdv)
        if canal:
            _ca_prev_q = _ca_prev_q.where(Vente.canal == canal)
        ca_prev_by_famille = {(r[0] or '').strip().lower(): round(r[1] or 0) for r in session.exec(_ca_prev_q).all()}
    else:
        ca_prev_by_famille = {}

    familles_out = []
    for famille, sf_map in sorted(hier.items()):
        f_weeks = [0.0] * 4
        sfs_out = []
        for sf, prod_map in sf_map.items():
            sf_weeks = [0.0] * 4
            prods_out = []
            for prod, wks in prod_map.items():
                for i in range(4):
                    sf_weeks[i] += wks[i]
                prod_top_fdv = sorted(
                    [{"code": c, "nom": fdv_name_map.get(c, c), "total": round(t)}
                     for c, t in fdv_by_sf_prod[famille][sf][prod].items()],
                    key=lambda x: -x["total"]
                )
                prod_code = prod_label_to_code.get(prod)
                prod_obj_t = obj_by_prod.get(prod_code) if prod_code else None
                prod_obj   = obj_by_prod_total.get(prod_code) if prod_code else None
                prod_tonne = obj_tonne_by_prod.get(prod_code) if prod_code else None
                prods_out.append({
                    "nom": prod,
                    "total": round(sum(wks)),
                    "weeks": [round(v) for v in wks],
                    "top_fdv": prod_top_fdv,
                    "objectif_packs": round(prod_obj) if prod_obj else None,
                    "objectif_packs_tournee": round(prod_obj_t) if prod_obj_t else None,
                    "objectif_tonne": round(prod_tonne, 3) if prod_tonne else None,
                })
            for i in range(4):
                f_weeks[i] += sf_weeks[i]
            sf_obj_vals = [
                obj_by_prod_total[prod_label_to_code[p["nom"]]]
                for p in prods_out
                if p["nom"] in prod_label_to_code and prod_label_to_code[p["nom"]] in obj_by_prod_total
                and obj_by_prod_total[prod_label_to_code[p["nom"]]]
            ]
            sf_obj = round(sum(sf_obj_vals)) if sf_obj_vals else None
            sf_tonne_vals = [
                obj_tonne_by_prod[prod_label_to_code[p["nom"]]]
                for p in prods_out
                if p["nom"] in prod_label_to_code and prod_label_to_code[p["nom"]] in obj_tonne_by_prod
                and obj_tonne_by_prod[prod_label_to_code[p["nom"]]]
            ]
            sf_tonne = round(sum(sf_tonne_vals), 3) if sf_tonne_vals else None
            sfs_out.append({
                "nom": sf,
                "total": round(sum(sf_weeks)),
                "weeks": [round(v) for v in sf_weeks],
                "produits": sorted(prods_out, key=lambda x: -x["total"]),
                "objectif_packs": sf_obj,
                "objectif_tonne": sf_tonne,
            })

        f_total = round(sum(f_weeks))
        prev_total = round(prev_famille_total.get(famille, 0))
        delta_pct = round((f_total - prev_total) / prev_total * 100) if prev_total > 0 else None

        top_fdv = sorted(
            [{"code": c, "nom": fdv_name_map.get(c, c), "total": round(t)} for c, t in fdv_by_famille[famille].items()],
            key=lambda x: -x["total"]
        )

        # Derive family objective from SF objectives so hierarchy is consistent
        f_obj_vals = [sf["objectif_packs"] for sf in sfs_out if sf["objectif_packs"]]
        f_obj = round(sum(f_obj_vals)) if f_obj_vals else None
        f_tonne_vals = [sf["objectif_tonne"] for sf in sfs_out if sf["objectif_tonne"]]
        f_tonne = round(sum(f_tonne_vals), 3) if f_tonne_vals else None

        familles_out.append({
            "nom": famille,
            "total": f_total,
            "total_prev": prev_total,
            "delta_pct": delta_pct,
            "weeks": [round(v) for v in f_weeks],
            "sous_familles": sorted(sfs_out, key=lambda x: -x["total"]),
            "top_fdv": top_fdv,
            "objectif_packs": f_obj,
            "objectif_tonne": f_tonne,
            "ca": ca_by_famille.get(famille) or None,
            "ca_prev": ca_prev_by_famille.get(famille) or None,
        })

    # True global objective totals — summed directly from the objectifs table
    if canal == 'VD':
        global_obj_tonne = sum(r.objectif_tonne_vd or 0 for r in obj_prod_rows)
        global_obj_packs = sum(r.objectif_packs_vd or 0 for r in obj_prod_rows)
    elif canal == 'VH':
        global_obj_tonne = sum(r.objectif_tonne_vh or 0 for r in obj_prod_rows)
        global_obj_packs = sum(r.objectif_packs_vh or 0 for r in obj_prod_rows)
    else:
        global_obj_tonne = sum((r.objectif_tonne_vd or 0) + (r.objectif_tonne_vh or 0) for r in obj_prod_rows)
        global_obj_packs = sum((r.objectif_packs_vd or 0) + (r.objectif_packs_vh or 0) for r in obj_prod_rows)

    return {
        "periode": annee_mois,
        "periodes": list(all_periods),
        "prevendeurs": prevendeurs_out,
        "trend_6m": trend_6m,
        "trend_6m_labels": trend_6m_labels,
        "familles": sorted(familles_out, key=lambda x: -x["total"]),
        "objectif_packs_per_route": objectif_per_route or None,
        "global_objectif_tonne": round(global_obj_tonne, 3) if global_obj_tonne else None,
        "global_objectif_packs": round(global_obj_packs) if global_obj_packs else None,
        "global_ca": round(sum(ca_by_famille.values())) if ca_by_famille else None,
    }


@router.get("/admin/analytics")
def prevendeur_admin_analytics(
    annee_mois: str = Query(...),
    famille: Optional[str] = Query(None),
    fdv: Optional[str] = Query(None),
    canal: Optional[str] = Query(None),
    commune: Optional[str] = Query(None),
    produit: Optional[str] = Query(None),
    unite: str = Query('tonnes'),
    current_user: User = Depends(get_current_user),
    current_distributor = Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    # Periods list (no qty conversion needed)
    q_periods = select(Vente.annee_mois).distinct().order_by(Vente.annee_mois.desc())
    if current_distributor:
        q_periods = q_periods.where((Vente.distributor_id == current_distributor.id) | (Vente.distributor_id == None))
    all_periods_list = list(session.exec(q_periods).all())

    # FDV name map (no qty conversion needed)
    fdv_name_map = {
        p.employe_code: p.full_name
        for p in session.exec(
            select(User).where(User.role == UserRole.PREVENDEUR, User.is_active == True)
        ).all()
        if p.employe_code
    }

    # ── Build common raw-SQL WHERE conditions ──────────────────────────────────
    base_conds = ["v.annee_mois = :annee_mois", "v.statut_commande = 'Facturé'"]
    base_params: dict = {"annee_mois": annee_mois}

    if current_distributor:
        base_conds.append("(v.distributor_id = :dist_id OR v.distributor_id IS NULL)")
        base_params["dist_id"] = current_distributor.id
    if fdv:
        base_conds.append("v.code_fdv = :fdv")
        base_params["fdv"] = fdv
    if canal:
        base_conds.append("v.canal = :canal")
        base_params["canal"] = canal
    # Optional filter strings (appended per-query as needed)
    if famille:
        base_params["famille"] = famille
    if commune:
        base_params["commune"] = commune
    if produit:
        base_params["produit"] = produit

    _famille_cond = "LOWER(v.famille) = LOWER(:famille)" if famille else ""
    _commune_cond = "LOWER(v.commune) = LOWER(:commune)"  if commune  else ""
    _produit_cond = "v.code_produit = :produit"           if produit  else ""

    _qty   = qty_expr(unite)
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

    def _from(extra_join: str = "") -> str:
        parts = ["FROM ventes v"]
        if _pjoin:
            parts.append(_pjoin)
        if extra_join:
            parts.append(extra_join)
        return "\n        ".join(parts)

    def _where(*extra: str) -> str:
        return " AND ".join(base_conds + [c for c in extra if c])

    # ── KPIs ───────────────────────────────────────────────────────────────────
    total_ventes = round(session.execute(text(f"""
        SELECT COALESCE(SUM({_qty}), 0)
        {_from()}
        WHERE {_where(_famille_cond, _commune_cond, _produit_cond)}
    """), base_params).scalar() or 0)

    nb_fdvs = session.execute(text(f"""
        SELECT COUNT(DISTINCT v.code_fdv)
        FROM ventes v
        WHERE {_where(_famille_cond, _commune_cond, _produit_cond)} AND v.code_fdv IS NOT NULL
    """), base_params).scalar() or 0

    tf_row = session.execute(text(f"""
        SELECT v.famille, COALESCE(SUM({_qty}), 0) AS t
        {_from()}
        WHERE {_where(_commune_cond, _produit_cond)} AND v.famille IS NOT NULL
        GROUP BY v.famille ORDER BY t DESC LIMIT 1
    """), base_params).first()

    tfdv_row = session.execute(text(f"""
        SELECT v.code_fdv, COALESCE(SUM({_qty}), 0) AS t
        {_from()}
        WHERE {_where(_famille_cond, _commune_cond, _produit_cond)} AND v.code_fdv IS NOT NULL
        GROUP BY v.code_fdv ORDER BY t DESC LIMIT 1
    """), base_params).first()

    # ── Monthly trend (last 6 periods) ─────────────────────────────────────────
    try:
        cur_idx = all_periods_list.index(annee_mois)
    except ValueError:
        cur_idx = 0
    trend_periods = list(reversed(all_periods_list[cur_idx:cur_idx + 6]))

    monthly = []
    if trend_periods:
        trend_conds = ["v.annee_mois = ANY(:trend_periods)", "v.statut_commande = 'Facturé'"]
        trend_params: dict = {"trend_periods": trend_periods}
        if current_distributor:
            trend_conds.append("(v.distributor_id = :dist_id OR v.distributor_id IS NULL)")
            trend_params["dist_id"] = current_distributor.id
        if famille:
            trend_conds.append("LOWER(v.famille) = LOWER(:famille)")
            trend_params["famille"] = famille
        if fdv:
            trend_conds.append("v.code_fdv = :fdv")
            trend_params["fdv"] = fdv
        if canal:
            trend_conds.append("v.canal = :canal")
            trend_params["canal"] = canal
        trend_where = " AND ".join(trend_conds)
        trend_rows = {
            r[0]: (round(r[1] or 0), r[2] or 0)
            for r in session.execute(text(f"""
                SELECT v.annee_mois, COALESCE(SUM({_qty}), 0), COUNT(v.code_fdv)
                {_from()}
                WHERE {trend_where}
                GROUP BY v.annee_mois
            """), trend_params).all()
        }
        monthly = [
            {"month": p, "total": trend_rows.get(p, (0, 0))[0], "nb_fdvs": trend_rows.get(p, (0, 0))[1]}
            for p in trend_periods
        ]

    # ── Breakdowns ─────────────────────────────────────────────────────────────
    # By famille (unfiltered by famille so all families always appear)
    by_famille = [
        {"famille": r[0], "total": round(r[1] or 0)}
        for r in session.execute(text(f"""
            SELECT v.famille, COALESCE(SUM({_qty}), 0) AS t
            {_from()}
            WHERE {_where(_commune_cond, _produit_cond)} AND v.famille IS NOT NULL
            GROUP BY v.famille ORDER BY t DESC
        """), base_params).all()
    ]

    # Top 10 produits (unfiltered by produit so list always shows)
    by_produit = [
        {"nom": r[0] or "?", "code": r[1], "total": round(r[2] or 0)}
        for r in session.execute(text(f"""
            SELECT v.description_produit, v.code_produit, COALESCE(SUM({_qty}), 0) AS t
            {_from()}
            WHERE {_where(_famille_cond, _commune_cond)} AND v.description_produit IS NOT NULL
            GROUP BY v.description_produit, v.code_produit ORDER BY t DESC LIMIT 10
        """), base_params).all()
    ]

    # Top 10 FDVs
    by_fdv = [
        {"nom": fdv_name_map.get(r[0], r[0]), "code": r[0], "total": round(r[1] or 0)}
        for r in session.execute(text(f"""
            SELECT v.code_fdv, COALESCE(SUM({_qty}), 0) AS t
            {_from()}
            WHERE {_where(_famille_cond, _commune_cond, _produit_cond)} AND v.code_fdv IS NOT NULL
            GROUP BY v.code_fdv ORDER BY t DESC LIMIT 10
        """), base_params).all()
    ]

    # By location
    _loc_join = "JOIN location_communes lc ON LOWER(v.commune) = LOWER(lc.commune_name) AND LOWER(v.wilaya) = LOWER(lc.wilaya_name)"
    by_location = [
        {"code": r[0], "name": r[1], "total": round(r[2] or 0)}
        for r in session.execute(text(f"""
            SELECT lc.commune_code, lc.commune_name, COALESCE(SUM({_qty}), 0) AS total
            {_from(_loc_join)}
            WHERE {_where(_famille_cond, _commune_cond, _produit_cond)} AND v.commune IS NOT NULL
            GROUP BY lc.commune_code, lc.commune_name ORDER BY total DESC
        """), base_params).all()
    ]

    return {
        "kpis": {
            "total_ventes": total_ventes,
            "nb_fdvs": nb_fdvs,
            "top_famille": {"nom": tf_row[0], "total": round(tf_row[1])} if tf_row else None,
            "top_fdv": {
                "nom": fdv_name_map.get(tfdv_row[0], tfdv_row[0]),
                "code": tfdv_row[0],
                "total": round(tfdv_row[1]),
            } if tfdv_row else None,
        },
        "monthly": monthly,
        "by_famille": by_famille,
        "by_produit": by_produit,
        "by_fdv": by_fdv,
        "by_location": by_location,
        "periodes": all_periods_list,
    }


@router.get("/objectifs")
def prevendeur_objectifs(
    annee_mois: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Any:
    if not current_user.employe_code:
        return []

    code_fdv = current_user.employe_code
    annee_int, mois_int = int(annee_mois.split('-')[0]), int(annee_mois.split('-')[1])

    code_upper = code_fdv.upper()
    use_vd = 'VH' not in code_upper  # default to VD unless explicitly VH

    # Actual sales per product — with name fallback from Vente
    sales_rows = session.exec(
        select(Vente.code_produit, Vente.description_produit, func.sum(Vente.qte_facturee))
        .where(Vente.code_fdv == code_fdv)
        .where(Vente.annee_mois == annee_mois)
        .where(Vente.source != 'BackOffice')
        .group_by(Vente.code_produit, Vente.description_produit)
    ).all()

    sales_by_code: dict = {}
    desc_by_code: dict = {}
    for code, desc, qty in sales_rows:
        if not code:
            continue
        sales_by_code[code] = sales_by_code.get(code, 0) + (qty or 0)
        if desc and code not in desc_by_code:
            desc_by_code[code] = desc

    # Objectives for this period
    obj_rows = session.exec(
        select(Objectif)
        .where(Objectif.mois == mois_int, Objectif.annee == annee_int)
    ).all()

    raw_obj: dict = {}
    for obj in obj_rows:
        if not obj.code_produit:
            continue
        objectif = obj.objectif_packs_vd_tournee if use_vd else obj.objectif_packs_vh_tournee
        raw_obj[obj.code_produit] = objectif or 0

    # Remap objective codes (may be code_dd) → vente codes
    obj_by_code = remap_by_vente_code(raw_obj, session)

    all_codes = set(sales_by_code.keys()) | set(obj_by_code.keys())
    code_to_produit = {}  # Produit model removed

    result = []
    for code in all_codes:
        actual = sales_by_code.get(code, 0)
        objectif = obj_by_code.get(code, 0)
        nom = desc_by_code.get(code) or code
        pct = round(min(actual / objectif * 100, 100)) if objectif else 0
        result.append({
            "code_produit": code,
            "nom_produit": nom,
            "famille": '',  # Produit model removed
            "actual": round(actual),
            "objectif": round(objectif),
            "pct": pct,
        })

    return sorted(result, key=lambda x: (x['pct'], x['nom_produit']))
