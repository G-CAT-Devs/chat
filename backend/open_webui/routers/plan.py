import time
import requests
from fastapi import APIRouter, Depends
from open_webui.utils.auth import get_verified_user
from open_webui.env import (
    GCAT_PANEL_INTERNAL_URL,
    GCAT_INTERNAL_API_SECRET,
    GCAT_PLAN_ENABLED,
)

router = APIRouter()

# In-memory cache: {user_id: (payload, timestamp)}
_PLAN_CACHE = {}
CACHE_TTL_SECONDS = 30


@router.get("/")
async def get_user_plan(user=Depends(get_verified_user)):
    """
    Self-scoped endpoint to fetch user's active plan, limits, and usage from Omni Panel.
    """
    if not GCAT_PLAN_ENABLED:
        return {"available": False, "reason": "disabled"}

    user_id = str(user.id)
    now = time.time()

    # Check cache
    if user_id in _PLAN_CACHE:
        payload, ts = _PLAN_CACHE[user_id]
        if now - ts < CACHE_TTL_SECONDS:
            return payload

    url = f"{GCAT_PANEL_INTERNAL_URL.rstrip('/')}/api/internal/v1/entitlement"
    headers = {
        "Authorization": f"Bearer {GCAT_INTERNAL_API_SECRET}",
    }
    params = {
        "owui_user_id": user_id,
        "email": user.email if hasattr(user, "email") else "",
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            _PLAN_CACHE[user_id] = (data, now)
            return data
        else:
            return {"available": False, "reason": "upstream"}
    except Exception:
        return {"available": False, "reason": "upstream"}
