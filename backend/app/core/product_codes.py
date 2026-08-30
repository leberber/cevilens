"""
Helpers to resolve product code mismatches between ventes and objectifs.

Background:
  - ``ventes.code_produit``   — the standard product code (used as the key in sales data)
  - ``objectifs.code_produit`` — may be the "DD code" (= ``produits.code_dd``) when it
                                  differs from the standard code
  - ``produits.code_dd``       — populated when the product uses a different code in the
                                  objectives system; NULL when both tables share the same code

Usage:
    from app.core.product_codes import remap_by_vente_code

    # obj_dict is keyed by objectif code (may be code_dd).
    # After remapping, it is keyed by the vente / produit code.
    obj_by_vente = remap_by_vente_code(obj_dict, session)
    actual = obj_by_vente.get(vente_code, 0)
"""

from typing import Dict

from sqlalchemy import text
from sqlmodel import Session


def load_obj_to_vente_map(session: Session) -> Dict[str, str]:
    """Return a mapping ``{code_dd: code_produit}`` for all products where code_dd is set."""
    rows = session.execute(
        text("SELECT code_dd, code_produit FROM produits WHERE code_dd IS NOT NULL")
    ).all()
    return {row[0]: row[1] for row in rows}


def remap_by_vente_code(obj_dict: Dict, session: Session) -> Dict:
    """
    Remap a dict keyed by objectif/DD code to one keyed by vente (produit) code.

    Keys that are already vente codes (no code_dd entry) are preserved unchanged.
    """
    obj_to_vente = load_obj_to_vente_map(session)
    return {obj_to_vente.get(k, k): v for k, v in obj_dict.items()}
