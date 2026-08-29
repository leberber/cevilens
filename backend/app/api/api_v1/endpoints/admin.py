import logging
import traceback
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_platform_admin
from app.core.logging_config import get_log_stats, read_logs
from app.models.user import User

logger = logging.getLogger("app")
router = APIRouter()


@router.get("/logs")
def get_logs(
    lines: int = Query(default=100, ge=10, le=1000),
    level: Optional[str] = Query(default=None),
    current_user: User = Depends(require_platform_admin),
) -> Any:
    try:
        entries = read_logs(lines=lines, level=level)
        stats = get_log_stats()
        return {"entries": entries, "stats": stats}
    except Exception as exc:
        logger.error("Erreur lecture logs: %s\n%s", exc, traceback.format_exc())
        raise
