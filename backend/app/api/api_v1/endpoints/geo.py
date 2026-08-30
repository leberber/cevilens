from collections import defaultdict
from typing import Any, Optional
import json as _json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlmodel import Session

from app.api.deps import get_current_user, get_current_distributor
from app.core.product_codes import remap_by_vente_code
from app.core.tonnage import PRODUITS_JOIN, qty_expr
from app.database import get_session
from app.models.user import User, UserRole

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
    annee_mois: str = Query(...),
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
        "v.annee_mois = :annee_mois",
        "v.statut_commande = 'Facturé'",
        "v.wilaya IS NOT NULL",
    ]
    params: dict = {"annee_mois": annee_mois}

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
    annee_mois: str = Query(...),
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
        annee = int(annee_mois[:4])
        mois  = int(annee_mois[5:])
    except (ValueError, IndexError):
        return []

    conds: list = [
        "v.annee_mois = :annee_mois",
        "v.statut_commande = 'Facturé'",
        "v.famille IS NOT NULL",
    ]
    params: dict = {"annee_mois": annee_mois}

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

    obj_rows = session.execute(text(
        f"SELECT o.code_produit, {obj_expr} AS obj FROM objectifs o WHERE {' AND '.join(obj_conds)}"
    ), obj_params).all()
    # Remap objective codes (may be code_dd) → vente codes so the hier lookup matches
    obj_by_code: dict = remap_by_vente_code(
        {r[0]: float(r[1] or 0) for r in obj_rows if r[0]}, session
    )

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
        f_total = f_obj = 0.0

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
            f_obj   += sf_obj

        result.append({
            "nom": famille, "total": round(f_total, 3),
            "objectif": round(f_obj, 3) if f_obj else None,
            "sous_familles": sorted(sfs_out, key=lambda x: -x["total"]),
        })

    return sorted(result, key=lambda x: -x["total"])
