from collections import defaultdict
from datetime import date
from typing import Any, Optional
import json as _json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlmodel import Session

from app.api.deps import get_current_user, get_current_distributor
from app.core.tonnage import PRODUITS_JOIN, qty_expr
from app.database import get_session
from app.models.user import User

router = APIRouter()


@router.get("/communes-geojson")
def get_communes_geojson(
    codes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Any:
    sql = (
        "SELECT commune_code, commune_name, ST_AsGeoJSON(geom) "
        "FROM location_communes WHERE geom IS NOT NULL"
    )
    params: dict = {}
    if codes:
        code_list = [int(c) for c in codes.split(",") if c.strip().isdigit()]
        if code_list:
            sql += " AND commune_code = ANY(:codes)"
            params["codes"] = code_list
    sql += " ORDER BY commune_code"
    rows = session.execute(text(sql), params).all()
    features = [
        {
            "type": "Feature",
            "properties": {"code": code, "name": name},
            "geometry": _json.loads(geom_json),
        }
        for code, name, geom_json in rows
        if geom_json
    ]
    return {"type": "FeatureCollection", "features": features}


@router.get("/by-location")
def get_by_location(
    date_from: str = Query(...),
    date_to: str = Query(...),
    canal: Optional[str] = Query(None),
    produit: Optional[str] = Query(None),
    fdv: Optional[str] = Query(None),
    famille: Optional[str] = Query(None),
    sous_famille: Optional[str] = Query(None),
    unite: str = Query("tonnes"),
    current_user: User = Depends(get_current_user),
    current_distributor=Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    """
    Returns ALL communes for every wilaya that has sales in the given period,
    including communes with zero sales (total=0). Totals are in the requested
    unit (tonnes or packs).
    """
    base_conditions = [
        "v.date_commande BETWEEN :date_from AND :date_to",
        "v.statut_commande = 'Facturé'",
        "v.wilaya IS NOT NULL",
    ]
    params: dict = {"date_from": date_from, "date_to": date_to}

    if current_distributor:
        base_conditions.append(
            "(v.distributor_id = :distributor_id OR v.distributor_id IS NULL)"
        )
        params["distributor_id"] = current_distributor.id
    if canal:
        base_conditions.append("v.canal = :canal")
        params["canal"] = canal
    if fdv:
        base_conditions.append("v.code_fdv = :fdv")
        params["fdv"] = fdv
    if famille:
        base_conditions.append("LOWER(v.famille) = LOWER(:famille)")
        params["famille"] = famille
    if sous_famille:
        base_conditions.append("LOWER(v.sous_famille) = LOWER(:sous_famille)")
        params["sous_famille"] = sous_famille

    base_where = " AND ".join(base_conditions)

    sales_conditions = list(base_conditions) + ["v.commune IS NOT NULL"]
    if produit:
        sales_conditions.append("v.code_produit = :produit")
        params["produit"] = produit
    sales_where = " AND ".join(sales_conditions)

    _qty   = qty_expr(unite)
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

    sql = f"""
        WITH active_wilayas AS (
            SELECT DISTINCT LOWER(v.wilaya) AS wilaya_lower
            FROM ventes v
            WHERE {base_where}
        ),
        sales AS (
            SELECT lc.commune_code,
                   COALESCE(SUM({_qty}), 0) AS total
            FROM ventes v
            {_pjoin}
            JOIN location_communes lc
              ON LOWER(v.commune) = LOWER(lc.commune_name)
             AND LOWER(v.wilaya)  = LOWER(lc.wilaya_name)
            WHERE {sales_where}
            GROUP BY lc.commune_code
        )
        SELECT lc.commune_code,
               lc.commune_name,
               lc.wilaya_name,
               COALESCE(s.total, 0) AS total
        FROM location_communes lc
        JOIN active_wilayas aw ON LOWER(lc.wilaya_name) = aw.wilaya_lower
        LEFT JOIN sales s ON lc.commune_code = s.commune_code
        ORDER BY total DESC, lc.commune_name
    """

    rows = session.execute(text(sql), params).all()
    return [
        {
            "code": row[0],
            "name": row[1],
            "wilaya": row[2],
            "total": round(float(row[3] or 0), 3),
        }
        for row in rows
    ]


@router.get("/product-tree")
def get_product_tree(
    date_from: str = Query(...),
    date_to: str = Query(...),
    canal: Optional[str] = Query(None),
    commune: Optional[str] = Query(None),
    fdv: Optional[str] = Query(None),
    unite: str = Query("tonnes"),
    current_user: User = Depends(get_current_user),
    current_distributor=Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    """
    Returns a famille → sous_famille → produit hierarchy with sales totals
    and objectives. Totals are in the requested unit (tonnes or packs).
    """
    try:
        d     = date.fromisoformat(date_from)
        annee = d.year
        mois  = d.month
    except (ValueError, TypeError):
        return []

    conds: list = [
        "v.date_commande BETWEEN :date_from AND :date_to",
        "v.statut_commande = 'Facturé'",
        "v.famille IS NOT NULL",
    ]
    params: dict = {"date_from": date_from, "date_to": date_to}

    if current_distributor:
        conds.append("(v.distributor_id = :dist_id OR v.distributor_id IS NULL)")
        params["dist_id"] = current_distributor.id
    if canal:
        conds.append("v.canal = :canal")
        params["canal"] = canal
    if fdv:
        conds.append("v.code_fdv = :fdv")
        params["fdv"] = fdv
    if commune:
        conds.append("LOWER(v.commune) = LOWER(:commune)")
        params["commune"] = commune

    where  = " AND ".join(conds)
    _qty   = qty_expr(unite)
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

    rows = session.execute(text(f"""
        SELECT
            TRIM(v.famille)                           AS famille,
            TRIM(COALESCE(v.sous_famille, 'Autres'))  AS sous_famille,
            v.code_produit,
            v.description_produit,
            SUM({_qty})                               AS total
        FROM ventes v
        {_pjoin}
        WHERE {where}
        GROUP BY
            TRIM(v.famille),
            TRIM(COALESCE(v.sous_famille, 'Autres')),
            v.code_produit,
            v.description_produit
    """), params).all()

    # Objectives are always in tonnes (objectif_tonne_vd/vh columns)
    if canal == "VD":
        obj_expr = "COALESCE(o.objectif_tonne_vd, 0)"
    elif canal == "VH":
        obj_expr = "COALESCE(o.objectif_tonne_vh, 0)"
    else:
        obj_expr = "COALESCE(o.objectif_tonne_vd, 0) + COALESCE(o.objectif_tonne_vh, 0)"

    obj_conds = ["o.annee = :annee", "o.mois = :mois"]
    obj_params: dict = {"annee": annee, "mois": mois}
    if current_distributor:
        obj_conds.append("o.distributor_id = :dist_id")
        obj_params["dist_id"] = current_distributor.id

    # Single query: resolve code_dd aliases via LATERAL join (one produit per objectif row,
    # preferring exact code_produit match). Builds both obj_by_code and obj_by_famille
    # without extra round-trips. Famille objectives include products with zero sales —
    # the monthly target is always the full amount from the objectifs table.
    obj_obj_where = " AND ".join(obj_conds)
    combined_obj_rows = session.execute(text(f"""
        SELECT
            COALESCE(p.code_produit, o.code_produit) AS vente_code,
            TRIM(p.famille)                           AS famille,
            SUM({obj_expr})                           AS obj
        FROM objectifs o
        LEFT JOIN LATERAL (
            SELECT code_produit, famille
            FROM produits
            WHERE code_produit = o.code_produit
               OR (code_dd IS NOT NULL AND code_dd = o.code_produit)
            ORDER BY (code_produit = o.code_produit) DESC
            LIMIT 1
        ) p ON TRUE
        WHERE {obj_obj_where}
        GROUP BY COALESCE(p.code_produit, o.code_produit), TRIM(p.famille)
    """), obj_params).all()

    obj_by_code: dict = {}
    obj_by_famille: dict = defaultdict(float)
    for vente_code, famille, obj_val in combined_obj_rows:
        v = float(obj_val or 0)
        if vente_code:
            obj_by_code[vente_code] = obj_by_code.get(vente_code, 0) + v
        if famille:
            obj_by_famille[famille] += v

    # Build hierarchy: famille → sf → (code, nom) → {total, obj}
    hier: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"total": 0.0, "obj": 0.0})))
    for famille, sf, code, nom, total in rows:
        if not famille:
            continue
        key = (code or "", nom or code or "?")
        hier[famille][sf][key]["total"] += float(total or 0)
        hier[famille][sf][key]["obj"]   += obj_by_code.get(code or "", 0)

    result = []
    for famille, sf_map in hier.items():
        sfs_out = []
        f_total = 0.0

        for sf, prod_map in sf_map.items():
            prods_out = []
            sf_total = sf_obj = 0.0

            for (code, nom), data in sorted(prod_map.items(), key=lambda x: -x[1]["total"]):
                prods_out.append({
                    "nom": nom, "code": code,
                    "total": round(data["total"], 3),
                    "objectif": round(data["obj"], 3) if data["obj"] else None,
                })
                sf_total += data["total"]
                sf_obj   += data["obj"]

            sfs_out.append({
                "nom": sf, "total": round(sf_total, 3),
                "objectif": round(sf_obj, 3) if sf_obj else None,
                "produits": prods_out,
            })
            f_total += sf_total

        # Use the directly-queried famille objective (fixed monthly target from objectifs table)
        f_obj = obj_by_famille.get(famille, 0)
        result.append({
            "nom": famille, "total": round(f_total, 3),
            "objectif": round(f_obj, 3) if f_obj else None,
            "sous_familles": sorted(sfs_out, key=lambda x: -x["total"]),
        })

    return sorted(result, key=lambda x: -x["total"])


@router.get("/commune-analytics")
def get_commune_analytics(
    commune: str = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
    canal: Optional[str] = Query(None),
    unite: str = Query("tonnes"),
    current_user: User = Depends(get_current_user),
    current_distributor=Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    try:
        d = date.fromisoformat(date_from)
    except (ValueError, TypeError):
        return {}

    curr_ym    = d.strftime("%Y-%m")
    prev_month = d.month - 1 or 12
    prev_year  = d.year - (1 if d.month == 1 else 0)
    prev_ym    = f"{prev_year}-{prev_month:02d}"

    _qty   = qty_expr(unite)
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

    # Shared base conditions (no date filter yet)
    common: list = [
        "v.statut_commande = 'Facturé'",
        "LOWER(v.commune) = LOWER(:commune)",
    ]
    p: dict = {"commune": commune}
    if current_distributor:
        common.append("(v.distributor_id = :dist_id OR v.distributor_id IS NULL)")
        p["dist_id"] = current_distributor.id
    if canal:
        common.append("v.canal = :canal")
        p["canal"] = canal

    curr_where = " AND ".join(common + ["v.date_commande BETWEEN :date_from AND :date_to"])
    prev_where = " AND ".join(common + ["v.annee_mois = :prev_ym"])
    cli_where  = " AND ".join(common + ["v.code_client IS NOT NULL", "v.annee_mois = :ym"])

    curr_p = {**p, "date_from": date_from, "date_to": date_to}
    prev_p = {**p, "prev_ym": prev_ym}

    # 1. by famille
    fam_rows = session.execute(text(f"""
        SELECT TRIM(v.famille) AS fam, SUM({_qty}) AS total
        FROM ventes v {_pjoin}
        WHERE {curr_where} AND v.famille IS NOT NULL
        GROUP BY TRIM(v.famille)
        ORDER BY total DESC
    """), curr_p).all()

    # 2. by produit (top 20)
    prod_rows = session.execute(text(f"""
        SELECT v.code_produit, v.description_produit,
               TRIM(v.famille) AS famille, SUM({_qty}) AS total
        FROM ventes v {_pjoin}
        WHERE {curr_where} AND v.code_produit IS NOT NULL
        GROUP BY v.code_produit, v.description_produit, TRIM(v.famille)
        ORDER BY total DESC
        LIMIT 20
    """), curr_p).all()

    # 3. by FDV
    fdv_rows = session.execute(text(f"""
        SELECT v.code_fdv, MAX(v.nom_fdv) AS nom,
               SUM({_qty}) AS total,
               COUNT(DISTINCT v.code_client) AS nb_clients
        FROM ventes v {_pjoin}
        WHERE {curr_where} AND v.code_fdv IS NOT NULL
        GROUP BY v.code_fdv
        ORDER BY total DESC
    """), curr_p).all()

    # 4. canal split
    canal_rows = session.execute(text(f"""
        SELECT v.canal, COALESCE(SUM({_qty}), 0)
        FROM ventes v {_pjoin}
        WHERE {curr_where} AND v.canal IS NOT NULL
        GROUP BY v.canal
    """), curr_p).all()

    # 5. current total + nb clients
    kpi_row = session.execute(text(f"""
        SELECT COALESCE(SUM({_qty}), 0), COUNT(DISTINCT v.code_client)
        FROM ventes v {_pjoin}
        WHERE {curr_where}
    """), curr_p).one()

    # 6. prev period total (for trend)
    prev_row = session.execute(text(f"""
        SELECT COALESCE(SUM({_qty}), 0)
        FROM ventes v {_pjoin}
        WHERE {prev_where}
    """), prev_p).one()

    # 7. clients servis (current month)
    servis_rows = session.execute(text(f"""
        SELECT v.code_client, MAX(v.nom_client), COALESCE(SUM(v.total_facture), 0)
        FROM ventes v
        WHERE {cli_where}
        GROUP BY v.code_client
        ORDER BY 3 DESC NULLS LAST
        LIMIT 20
    """), {**p, "ym": curr_ym}).all()

    servis_codes = {r[0] for r in servis_rows}

    # 8. clients manqués (prev month, not in current)
    prev_cli_rows = session.execute(text(f"""
        SELECT v.code_client, MAX(v.nom_client), COALESCE(SUM(v.total_facture), 0)
        FROM ventes v
        WHERE {cli_where}
        GROUP BY v.code_client
        ORDER BY 3 DESC NULLS LAST
        LIMIT 50
    """), {**p, "ym": prev_ym}).all()

    # 9. per-client famille breakdown (current period — for servis bars)
    cli_fam_rows = session.execute(text(f"""
        SELECT v.code_client, TRIM(v.famille) AS fam, SUM({_qty}) AS total
        FROM ventes v {_pjoin}
        WHERE {curr_where} AND v.code_client IS NOT NULL AND v.famille IS NOT NULL
        GROUP BY v.code_client, TRIM(v.famille)
        ORDER BY v.code_client, total DESC
    """), curr_p).all()

    cli_fam_map: dict = defaultdict(list)
    for code, fam, total in cli_fam_rows:
        cli_fam_map[code].append({"nom": fam, "total": round(float(total or 0), 3)})

    # 10. per-client famille breakdown (prev period — for manqués bars)
    prev_cli_fam_rows = session.execute(text(f"""
        SELECT v.code_client, TRIM(v.famille) AS fam, SUM({_qty}) AS total
        FROM ventes v {_pjoin}
        WHERE {prev_where} AND v.code_client IS NOT NULL AND v.famille IS NOT NULL
        GROUP BY v.code_client, TRIM(v.famille)
        ORDER BY v.code_client, total DESC
    """), prev_p).all()

    prev_cli_fam_map: dict = defaultdict(list)
    for code, fam, total in prev_cli_fam_rows:
        prev_cli_fam_map[code].append({"nom": fam, "total": round(float(total or 0), 3)})

    curr_total = float(kpi_row[0] or 0)
    prev_total = float(prev_row[0] or 0)
    pct_change = round((curr_total - prev_total) / prev_total * 100, 1) if prev_total else None
    canal_map  = {r[0]: float(r[1] or 0) for r in canal_rows}

    return {
        "kpis": {
            "total":      round(curr_total, 3),
            "total_prev": round(prev_total, 3),
            "pct_change": pct_change,
            "nb_clients": int(kpi_row[1] or 0),
        },
        "by_famille": [
            {"nom": r[0], "total": round(float(r[1] or 0), 3)}
            for r in fam_rows if r[0]
        ],
        "by_produit": [
            {"code": r[0] or "", "nom": r[1] or r[0] or "?",
             "famille": r[2] or "", "total": round(float(r[3] or 0), 3)}
            for r in prod_rows
        ],
        "by_fdv": [
            {"code": r[0] or "", "nom": r[1] or r[0] or "FDV",
             "total": round(float(r[2] or 0), 3), "nb_clients": int(r[3] or 0)}
            for r in fdv_rows
        ],
        "canal_split": {
            "vd": round(canal_map.get("VD", 0), 3),
            "vh": round(canal_map.get("VH", 0), 3),
        },
        "clients": {
            "servis": [
                {"code": r[0], "nom": r[1] or r[0], "total": round(float(r[2] or 0), 2),
                 "by_famille": cli_fam_map.get(r[0], [])}
                for r in servis_rows
            ],
            "manques": [
                {"code": r[0], "nom": r[1] or r[0], "total": round(float(r[2] or 0), 2),
                 "by_famille": prev_cli_fam_map.get(r[0], [])}
                for r in prev_cli_rows if r[0] not in servis_codes
            ][:20],
        },
    }


@router.get("/client-products")
def get_client_products(
    code_client: str = Query(...),
    commune: str = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
    canal: Optional[str] = Query(None),
    unite: str = Query("tonnes"),
    current_user: User = Depends(get_current_user),
    current_distributor=Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    _qty   = qty_expr(unite)
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

    conds: list = [
        "v.statut_commande = 'Facturé'",
        "v.code_client = :code_client",
        "LOWER(v.commune) = LOWER(:commune)",
        "v.date_commande BETWEEN :date_from AND :date_to",
    ]
    params: dict = {
        "code_client": code_client, "commune": commune,
        "date_from": date_from, "date_to": date_to,
    }
    if current_distributor:
        conds.append("(v.distributor_id = :dist_id OR v.distributor_id IS NULL)")
        params["dist_id"] = current_distributor.id
    if canal:
        conds.append("v.canal = :canal")
        params["canal"] = canal
    where = " AND ".join(conds)

    by_famille = session.execute(text(f"""
        SELECT TRIM(v.famille) AS fam, SUM({_qty}) AS total
        FROM ventes v {_pjoin}
        WHERE {where} AND v.famille IS NOT NULL
        GROUP BY TRIM(v.famille)
        ORDER BY total DESC
    """), params).all()

    by_produit = session.execute(text(f"""
        SELECT v.code_produit, v.description_produit,
               TRIM(v.famille) AS famille, SUM({_qty}) AS total
        FROM ventes v {_pjoin}
        WHERE {where} AND v.code_produit IS NOT NULL
        GROUP BY v.code_produit, v.description_produit, TRIM(v.famille)
        ORDER BY total DESC
        LIMIT 15
    """), params).all()

    return {
        "by_famille": [
            {"nom": r[0], "total": round(float(r[1] or 0), 3)}
            for r in by_famille if r[0]
        ],
        "by_produit": [
            {"code": r[0] or "", "nom": r[1] or r[0] or "?",
             "famille": r[2] or "", "total": round(float(r[3] or 0), 3)}
            for r in by_produit
        ],
    }


@router.get("/commune-clients")
def get_commune_clients(
    commune: str = Query(...),
    date_from: str = Query(...),
    date_to: str = Query(...),
    canal: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    current_distributor=Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    """
    Returns top clients served in a commune for the selected month (servis),
    and clients active in the previous month who have zero sales this month
    in the same commune (manques — missed clients).
    """
    try:
        d = date.fromisoformat(date_from)
    except (ValueError, TypeError):
        return {"servis": [], "manques": []}

    curr_ym  = d.strftime("%Y-%m")
    prev_month = d.month - 1 or 12
    prev_year  = d.year - (1 if d.month == 1 else 0)
    prev_ym  = f"{prev_year}-{prev_month:02d}"

    conds: list = [
        "v.statut_commande = 'Facturé'",
        "LOWER(v.commune) = LOWER(:commune)",
        "v.code_client IS NOT NULL",
    ]
    params: dict = {"commune": commune}
    if current_distributor:
        conds.append("(v.distributor_id = :dist_id OR v.distributor_id IS NULL)")
        params["dist_id"] = current_distributor.id
    if canal:
        conds.append("v.canal = :canal")
        params["canal"] = canal
    where = " AND ".join(conds)

    servis_rows = session.execute(text(f"""
        SELECT v.code_client, MAX(v.nom_client) AS nom, COALESCE(SUM(v.total_facture), 0) AS total
        FROM ventes v
        WHERE {where} AND v.annee_mois = :curr_ym
        GROUP BY v.code_client
        ORDER BY total DESC NULLS LAST
        LIMIT 20
    """), {**params, "curr_ym": curr_ym}).all()

    servis_codes = {r[0] for r in servis_rows}

    # Fetch previous month clients then exclude those already served this month in Python
    # to avoid a correlated subquery while keeping the query simple.
    prev_rows = session.execute(text(f"""
        SELECT v.code_client, MAX(v.nom_client) AS nom, COALESCE(SUM(v.total_facture), 0) AS total_prev
        FROM ventes v
        WHERE {where} AND v.annee_mois = :prev_ym
        GROUP BY v.code_client
        ORDER BY total_prev DESC NULLS LAST
        LIMIT 50
    """), {**params, "prev_ym": prev_ym}).all()

    servis = [
        {"code": r[0], "nom": r[1] or r[0], "total": round(float(r[2] or 0), 2)}
        for r in servis_rows
    ]
    manques = [
        {"code": r[0], "nom": r[1] or r[0], "total": round(float(r[2] or 0), 2)}
        for r in prev_rows
        if r[0] not in servis_codes
    ][:20]

    return {"servis": servis, "manques": manques}
