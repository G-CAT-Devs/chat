import os
import unittest
from unittest.mock import patch, MagicMock

os.environ['WEBUI_SECRET_KEY'] = 'mock_secret_key_for_unit_tests_only_12345'

from open_webui.routers.notifications import (
    ScheduledNotificationConfig,
    get_scheduled_notification,
    save_scheduled_notification,
)


class TestScheduledNotifications(unittest.IsolatedAsyncioTestCase):
    async def test_get_scheduled_notification_default(self):
        user_mock = MagicMock()
        user_mock.id = 'user_1'
        user_mock.role = 'user'

        with patch('open_webui.models.config.Config.get', return_value={}):
            res = await get_scheduled_notification(user=user_mock)
            self.assertEqual(res['enabled'], False)
            self.assertEqual(res['startTime'], '08:00')
            self.assertEqual(res['endTime'], '12:00')

    async def test_save_scheduled_notification_admin(self):
        admin_mock = MagicMock()
        admin_mock.id = 'admin_1'
        admin_mock.role = 'admin'

        form = ScheduledNotificationConfig(
            enabled=True,
            title='صبح بخیر',
            content='به سامانه چت GCAT خوش آمدید',
            url='/subscription',
            startTime='08:30',
            endTime='11:30',
            playSound=True,
        )

        with patch('open_webui.models.config.Config.upsert') as mock_upsert:
            res = await save_scheduled_notification(form_data=form, admin=admin_mock)
            self.assertTrue(res['ok'])
            self.assertEqual(res['config']['enabled'], True)
            self.assertEqual(res['config']['startTime'], '08:30')
            self.assertEqual(res['config']['endTime'], '11:30')
            mock_upsert.assert_called_once()


if __name__ == '__main__':
    unittest.main()
