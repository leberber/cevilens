from typing import Any, Optional
import json as _json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlmodel import Session

from app.api.deps import get_current_user, get_current_distributor
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
    current_user: User = Depends(get_current_user),
    current_distributor=Depends(get_current_distributor),
    session: Session = Depends(get_session),
) -> Any:
    """
    Returns ALL communes for every wilaya that has sales in the given period,
    including communes with zero sales (total=0). This lets the map always
    show full wilaya coverage regardless of product/filter selection.
    """
    # Base conditions — used to find active wilayas (no produit filter)
    base_conditions = [
        "v.annee_mois = :annee_mois",
        "v.statut_commande = 'Facturé'",
        "v.wilaya IS NOT NULL",
    ]
    params: dict = {"annee_mois": annee_mois}

    if current_user.role != UserRole.PLATFORM_ADMIN and current_distributor:
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

    base_where = " AND ".join(base_conditions)

    # Sales conditions — same as base + commune required + optional produit
    sales_conditions = list(base_conditions) + ["v.commune IS NOT NULL"]
    if produit:
        sales_conditions.append("v.code_produit = :produit")
        params["produit"] = produit
    sales_where = " AND ".join(sales_conditions)

    sql = f"""
        WITH active_wilayas AS (
            SELECT DISTINCT LOWER(v.wilaya) AS wilaya_lower
            FROM ventes v
            WHERE {base_where}
        ),
        sales AS (
            SELECT lc.commune_code,
                   COALESCE(SUM(v.qte_livree), 0) AS total
            FROM ventes v
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
            "total": round(row[3] or 0),
        }
        for row in rows
    ]
