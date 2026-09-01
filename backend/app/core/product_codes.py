"""
Helpers to resolve product code mismatches between ventes and objectifs.

Background:
  - ``ventes.code_produit``   — the standard product code (used as the key in sales data)
  - ``objectifs.code_produit`` — may be the "DD code" (= ``produits.code_dd``) when it
                                  differs from the standard code
  - ``produits.code_dd``       — populated when the product uses a different code in the
                                  objectives system; NULL when both tables share the same code
"""

from typing import Dict, Optional, Set

from sqlalchemy import or_
from sqlmodel import Session, select

from app.models.produit import Produit


def load_obj_to_vente_map(session: Session) -> Dict[str, str]:
    """Return a mapping ``{code_dd: code_produit}`` for all products where code_dd is set."""
    rows = session.exec(
        select(Produit.code_dd, Produit.code_produit).where(Produit.code_dd.isnot(None))
    ).all()
    return {row[0]: row[1] for row in rows}


def remap_dict(obj_dict: Dict, obj_to_vente: Dict[str, str]) -> Dict:
    """Remap a dict keyed by objectif/DD code using a pre-loaded map."""
    return {obj_to_vente.get(k, k): v for k, v in obj_dict.items()}


def remap_by_vente_code(obj_dict: Dict, session: Session, obj_to_vente: Optional[Dict[str, str]] = None) -> Dict:
    """
    Remap a dict keyed by objectif/DD code to one keyed by vente (produit) code.

    Pass *obj_to_vente* to avoid redundant DB queries when calling multiple times.
    """
    if obj_to_vente is None:
        obj_to_vente = load_obj_to_vente_map(session)
    return remap_dict(obj_dict, obj_to_vente)


def build_produit_map(codes: Set[str], session: Session) -> Dict[str, Produit]:
    """
    Build a mapping ``{code -> Produit}`` for a set of product codes.

    Resolves both ``code_produit`` and ``code_dd`` aliases so that lookups
    work regardless of which code system the caller uses.
    """
    if not codes:
        return {}
    produits = session.exec(
        select(Produit).where(
            or_(Produit.code_produit.in_(codes), Produit.code_dd.in_(codes))
        )
    ).all()
    result: Dict[str, Produit] = {}
    for p in produits:
        result[p.code_produit] = p
        if p.code_dd:
            result[p.code_dd] = p
    return result


def obj_val(row, field_base: str, canal: Optional[str], suffix: str = '') -> float:
    """Extract the canal-appropriate objective value from an objective row.

    Example: ``obj_val(r, 'objectif_tonne', 'VD')`` → ``r.objectif_tonne_vd``
             ``obj_val(r, 'objectif_packs', 'VD', '_tournee')`` → ``r.objectif_packs_vd_tournee``
    """
    if canal == 'VD':
        return getattr(row, f'{field_base}_vd{suffix}', 0) or 0
    elif canal == 'VH':
        return getattr(row, f'{field_base}_vh{suffix}', 0) or 0
    return (getattr(row, f'{field_base}_vd{suffix}', 0) or 0) + (getattr(row, f'{field_base}_vh{suffix}', 0) or 0)
