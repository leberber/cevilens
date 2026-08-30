"""
Shared SQL helpers for converting sales quantities to tonnes.

Usage in raw SQL endpoints:

    from app.core.tonnage import PRODUITS_JOIN, qty_expr

    _qty   = qty_expr(unite)          # SQL expression string
    _pjoin = PRODUITS_JOIN if unite == "tonnes" else ""

    sql = f'''
        SELECT COALESCE(SUM({_qty}), 0)
        FROM ventes v
        {_pjoin}
        WHERE ...
    '''

Convention:
  - ventes table alias : ``v``
  - produits table alias: ``p``  (added via PRODUITS_JOIN)
"""

PRODUITS_JOIN = "LEFT JOIN produits p ON v.code_produit = p.code_produit"


def tonnes_expr(qty_col: str = "v.qte_facturee") -> str:
    """SQL CASE expression: quantity × poids_unite_vente → tonnes.
    Yields 0 when the product has no weight defined."""
    return (
        f"CASE WHEN p.poids_unite_vente IS NOT NULL "
        f"THEN CAST({qty_col} AS NUMERIC) * p.poids_unite_vente "
        f"ELSE 0 END"
    )


def qty_expr(unite: str, qty_col: str = "v.qte_facturee") -> str:
    """Return the SQL expression for the requested unit.

    Args:
        unite:   ``'tonnes'`` → converts via poids_unite_vente;
                 any other value → raw ``qty_col``.
        qty_col: SQL column reference for the base quantity
                 (default: ``v.qte_facturee``).
    """
    return tonnes_expr(qty_col) if unite == "tonnes" else qty_col
