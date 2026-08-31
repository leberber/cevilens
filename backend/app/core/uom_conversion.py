"""
UOM conversion helpers — shared SQL expressions for normalizing sales quantities.

Usage::

    from app.core.uom_conversion import PRODUITS_JOIN, PACKS_EXPR, qty_expr

    _qty   = qty_expr(unite)          # tonnes or raw packs
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

Convention:
  - ventes table alias : ``v``
  - produits table alias: ``p``  (added via PRODUITS_JOIN)

UOM normalization for packs (PACKS_EXPR):
  - UN   → qte / colisage        (individual units → colis)
  - PLT  → qte × colisage_palette (palettes → colis)
  - PLT2 → qte × colisage_palette
  - others (FARDEAU, CARTON, BIDON, PACK, SAC, …) → qte as-is
"""

PRODUITS_JOIN = "LEFT JOIN produits p ON v.code_produit = p.code_produit"

# Normalized packs: converts any uom_vente to colis count (requires PRODUITS_JOIN)
PACKS_EXPR = (
    "CASE "
    "WHEN v.uom_vente = 'UN' AND p.colisage IS NOT NULL AND p.colisage > 0 "
    "THEN v.qte_facturee / p.colisage "
    "WHEN v.uom_vente IN ('PLT', 'PLT2') AND p.colisage_palette IS NOT NULL "
    "THEN v.qte_facturee * p.colisage_palette "
    "ELSE v.qte_facturee END"
)


def tonnes_expr(qty_col: str = "v.qte_facturee") -> str:
    """SQL CASE expression: quantity × poids_unite_vente (kg) / 1000 → tonnes."""
    return (
        f"CASE WHEN p.poids_unite_vente IS NOT NULL "
        f"THEN CAST({qty_col} AS NUMERIC) * p.poids_unite_vente / 1000 "
        f"ELSE 0 END"
    )


def qty_expr(unite: str, qty_col: str = "v.qte_facturee") -> str:
    """Return the SQL expression for the requested unit.

    ``'tonnes'`` → converts via poids_unite_vente; otherwise → raw qty.
    """
    return tonnes_expr(qty_col) if unite == "tonnes" else qty_col
