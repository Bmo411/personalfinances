import datetime
import uuid
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

import requests
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from integrations.auth import issue_key, SCOPES
from life.models import NotificationLog
from life.notifications import send_meditation_reminder
from .telegram import encrypt_token, token_for, send_telegram

TOKEN = '123456789:' + 'test-token-not-a-real-credential-123456'


@patch('users.telegram.requests.post')
class TelegramTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='telegram-owner')
        self.other = get_user_model().objects.create_user(username='telegram-other')
        self.client.force_authenticate(self.user)

    def api_response(self, post, result, code=200, ok=True):
        post.return_value.status_code = code
        post.return_value.json.return_value = {'ok': ok, 'result': result, 'error_code': code}

    def connect(self, post):
        self.api_response(post, {'is_bot': True, 'username': 'mi_guia_test_bot'})
        response = self.client.post('/api/users/telegram/connect/', {'token': TOKEN}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        return parse_qs(urlparse(response.data['link']).query)['start'][0]

    def update(self, nonce, chat_id=222, chat_type='private', sender=222):
        return {'update_id': 123, 'message': {'text': '/start ' + nonce, 'date': int(timezone.now().timestamp()), 'chat': {'type': chat_type, 'id': chat_id}, 'from': {'id': sender, 'is_bot': False}}}

    def linked_user(self):
        self.user.telegram_token_encrypted = encrypt_token(TOKEN)
        self.user.telegram_chat_id = 222
        self.user.meditation_channel = 'TELEGRAM'
        self.user.meditation_reminder_enabled = True
        self.user.save()

    def test_token_is_encrypted_and_never_returned_in_profile(self, post):
        self.connect(post)
        self.assertNotIn(TOKEN, self.user.telegram_token_encrypted)
        self.assertEqual(token_for(self.user), TOKEN)
        profile = self.client.get('/api/users/profile/').data
        self.assertTrue(profile['telegram_token_configured'])
        self.assertFalse(profile['telegram_connected'])
        self.assertNotIn('telegram_token_encrypted', profile)
        self.assertNotIn('telegram_link_digest', profile)
        self.assertNotIn(TOKEN, str(profile))
        with override_settings(SECRET_KEY='different-encryption-key'):
            self.assertEqual(token_for(self.user), '')

    def test_only_fresh_private_start_with_own_nonce_can_bind(self, post):
        nonce = self.connect(post)
        self.api_response(post, [self.update('wrong-' + nonce), self.update(nonce, -222, 'group', -222), self.update(nonce, sender=333)])
        self.assertEqual(self.client.post('/api/users/telegram/confirm/').status_code, 400)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.telegram_chat_id)
        self.api_response(post, [self.update(nonce)])
        self.assertEqual(self.client.post('/api/users/telegram/confirm/').status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.telegram_chat_id, 222)
        self.assertEqual(self.user.telegram_link_digest, '')
        calls = post.call_count
        self.assertEqual(self.client.post('/api/users/telegram/confirm/').status_code, 200)
        self.assertEqual(post.call_count, calls)
        self.other.refresh_from_db()
        self.assertIsNone(self.other.telegram_chat_id)

    def test_expired_link_and_foreign_nonce_do_not_bind(self, post):
        nonce = self.connect(post)
        self.client.force_authenticate(self.other)
        self.api_response(post, [self.update(nonce)])
        self.assertEqual(self.client.post('/api/users/telegram/confirm/').status_code, 400)
        self.client.force_authenticate(self.user)
        self.user.telegram_link_expires_at = timezone.now() - datetime.timedelta(seconds=1)
        self.user.save()
        self.assertEqual(self.client.post('/api/users/telegram/confirm/').status_code, 400)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.telegram_chat_id)

    def test_profile_cannot_set_chat_id_and_personal_key_cannot_connect(self, post):
        self.client.patch('/api/users/profile/', {'telegram_chat_id': 999, 'telegram_token_encrypted': TOKEN}, format='json')
        self.user.refresh_from_db()
        self.assertIsNone(self.user.telegram_chat_id)
        self.assertEqual(self.user.telegram_token_encrypted, '')
        _, token = issue_key(self.user, 'Cannot configure Telegram', SCOPES)
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.post('/api/users/telegram/connect/', {'token': TOKEN}, format='json').status_code, 401)
        post.assert_not_called()

    def test_invalid_replacement_preserves_existing_connection(self, post):
        self.linked_user()
        encrypted = self.user.telegram_token_encrypted
        self.api_response(post, None, code=401, ok=False)
        response = self.client.post('/api/users/telegram/connect/', {'token': TOKEN.replace('test', 'bad', 1)}, format='json')
        self.assertEqual(response.status_code, 502)
        self.user.refresh_from_db()
        self.assertEqual(self.user.telegram_token_encrypted, encrypted)
        self.assertEqual(self.user.telegram_chat_id, 222)
        self.assertNotIn(TOKEN, str(response.data))

    def test_test_send_replay_does_not_send_twice(self, post):
        self.linked_user()
        self.api_response(post, {'message_id': 44})
        nonce = str(uuid.uuid4())
        for _ in range(2):
            result = self.client.post('/api/users/telegram/test/', {}, format='json', HTTP_IDEMPOTENCY_KEY=nonce)
            self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(post.call_count, 1)
        self.assertEqual(NotificationLog.objects.count(), 1)
        self.assertEqual(post.call_args.kwargs['json']['chat_id'], 222)
        self.assertIn('/meditation', post.call_args.kwargs['json']['text'])

    def test_daily_telegram_runs_with_whatsapp_paused_and_does_not_repeat(self, post):
        self.linked_user()
        self.api_response(post, {'message_id': 45})
        local = timezone.make_aware(datetime.datetime(2026, 11, 17, 7))
        send_meditation_reminder(self.user, local - datetime.timedelta(minutes=1))
        post.assert_not_called()
        send_meditation_reminder(self.user, local)
        send_meditation_reminder(self.user, local + datetime.timedelta(minutes=1))
        self.assertEqual(post.call_count, 1)
        self.assertEqual(NotificationLog.objects.get().channel, 'TELEGRAM')
        self.assertFalse(self.user.whatsapp_enabled)

    def test_network_error_is_sanitized_and_disconnect_pauses_reminder(self, post):
        self.linked_user()
        post.side_effect = requests.Timeout('Secret URL: ' + TOKEN)
        status, error = send_telegram(self.user, 'Test')
        self.assertEqual(status, 'UNKNOWN')
        self.assertNotIn(TOKEN, error)
        self.assertEqual(self.client.post('/api/users/telegram/disconnect/').status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.meditation_reminder_enabled)
        self.assertEqual(self.user.telegram_token_encrypted, '')
        self.assertIsNone(self.user.telegram_chat_id)
