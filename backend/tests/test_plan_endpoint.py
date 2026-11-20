import os
import unittest
from unittest.mock import patch, MagicMock

# Set mock secret key before any open_webui imports
os.environ['WEBUI_SECRET_KEY'] = 'mock_secret_key_for_unit_tests_only_12345'
os.environ['GCAT_PANEL_INTERNAL_URL'] = 'https://ai.gcat.ir'
os.environ['GCAT_INTERNAL_API_SECRET'] = 'mock_secret'
os.environ['GCAT_PLAN_ENABLED'] = 'true'

from open_webui.routers.plan import get_user_plan


class TestPlanEndpoint(unittest.IsolatedAsyncioTestCase):
    async def test_get_user_plan_upstream_down(self):
        # Test fallback when upstream Omni panel fails or times out
        user_mock = MagicMock()
        user_mock.id = 'user_123'
        user_mock.email = 'test@example.com'

        with patch('requests.get', side_effect=Exception('Connection refused')):
            res = await get_user_plan(user=user_mock)
            self.assertEqual(res, {'available': False, 'reason': 'upstream'})

    async def test_get_user_plan_success(self):
        # Test success mapping from upstream Omni response
        user_mock = MagicMock()
        user_mock.id = 'user_456'
        user_mock.email = 'test@example.com'

        mock_payload = {
            'mode': 'subscription',
            'plan': {'name': 'Pro'},
            'limits': {'daily_tokens': 10000},
            'usage': {'daily': 2000},
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_payload

        with patch('requests.get', return_value=mock_resp):
            res = await get_user_plan(user=user_mock)
            self.assertEqual(res, mock_payload)


if __name__ == '__main__':
    unittest.main()
