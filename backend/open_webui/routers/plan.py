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


@router.get('/')
async def get_user_plan(user=Depends(get_verified_user)):
    """
    Self-scoped endpoint to fetch user's active plan, limits, and usage from Omni Panel.
    """
    if not GCAT_PLAN_ENABLED:
        return {'available': False, 'reason': 'disabled'}

    user_id = str(user.id)
    now = time.time()

    # Check cache
    if user_id in _PLAN_CACHE:
        payload, ts = _PLAN_CACHE[user_id]
        if now - ts < CACHE_TTL_SECONDS:
            return payload

    url = f'{GCAT_PANEL_INTERNAL_URL.rstrip("/")}/api/internal/v1/entitlement'
    headers = {
        'Authorization': f'Bearer {GCAT_INTERNAL_API_SECRET}',
    }
    params = {
        'owui_user_id': user_id,
        'email': user.email if hasattr(user, 'email') else '',
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            _PLAN_CACHE[user_id] = (data, now)
            return data
        else:
            return {'available': False, 'reason': 'upstream'}
    except Exception:
        return {'available': False, 'reason': 'upstream'}


@router.get('/history')
async def get_user_payment_history(user=Depends(get_verified_user)):
    """
    Self-scoped payment history proxy for the user.
    """
    url = f'{GCAT_PANEL_INTERNAL_URL.rstrip("/")}/api/internal/v1/history'
    headers = {'Authorization': f'Bearer {GCAT_INTERNAL_API_SECRET}'}
    params = {
        'owui_user_id': str(user.id),
        'email': user.email if hasattr(user, 'email') else '',
    }
    try:
        response = requests.get(url, headers=headers, params=params, timeout=3.0)
        if response.status_code == 200:
            return response.json()
        return {'items': [], 'total': 0}
    except Exception as e:
        return {'items': [], 'total': 0, 'error': str(e)}


@router.get('/admin/plans')
async def get_admin_subscription_plans(admin=Depends(get_verified_user)):
    """
    Admin-only endpoint to get all subscription plans from Omni panel.
    """
    if admin.role != 'admin':
        return {'error': 'Forbidden'}

    url = f'{GCAT_PANEL_INTERNAL_URL.rstrip("/")}/api/internal/v1/plans'
    headers = {'Authorization': f'Bearer {GCAT_INTERNAL_API_SECRET}'}
    try:
        res = requests.get(url, headers=headers, timeout=3.0)
        return res.json()
    except Exception as e:
        return {'error': str(e), 'plans': []}


@router.post('/admin/plans')
async def save_admin_subscription_plan(payload: dict, admin=Depends(get_verified_user)):
    """
    Admin-only endpoint to save or update subscription plan.
    """
    if admin.role != 'admin':
        return {'error': 'Forbidden'}

    url = f'{GCAT_PANEL_INTERNAL_URL.rstrip("/")}/api/internal/v1/plans'
    headers = {'Authorization': f'Bearer {GCAT_INTERNAL_API_SECRET}'}
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=3.0)
        return res.json()
    except Exception as e:
        return {'error': str(e)}


@router.delete('/admin/plans/{plan_id}')
async def delete_admin_subscription_plan(plan_id: str, admin=Depends(get_verified_user)):
    """
    Admin-only endpoint to delete a subscription plan.
    """
    if admin.role != 'admin':
        return {'error': 'Forbidden'}

    url = f'{GCAT_PANEL_INTERNAL_URL.rstrip("/")}/api/internal/v1/plans/{plan_id}'
    headers = {'Authorization': f'Bearer {GCAT_INTERNAL_API_SECRET}'}
    try:
        res = requests.delete(url, headers=headers, timeout=3.0)
        return res.json()
    except Exception as e:
        return {'error': str(e)}
