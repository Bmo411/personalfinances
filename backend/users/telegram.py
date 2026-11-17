"""Private Telegram delivery. Never log API URLs, which contain the bot token."""
import base64
import hashlib
import re

import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class TelegramError(Exception):
    def __init__(self, status, detail):
        self.status, self.detail = status, detail
        super().__init__(detail)


def cipher():
    key = hashlib.sha256(('life-guide:telegram:' + settings.SECRET_KEY).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_token(token):
    return cipher().encrypt(token.encode()).decode()


def token_for(user):
    if not user.telegram_token_encrypted:
        return ''
    try:
        return cipher().decrypt(user.telegram_token_encrypted.encode()).decode()
    except (InvalidToken, ValueError, UnicodeError):
        return ''


def telegram_api(token, method, data=None):
    if not re.fullmatch(r'[0-9]{5,20}:[A-Za-z0-9_-]{20,120}', token):
        raise TelegramError('CONFIG_REQUIRED', 'Revisa el token de tu bot de Telegram.')
    try:
        response = requests.post(f'https://api.telegram.org/bot{token}/{method}', json=data or {}, timeout=15)
        try:
            body = response.json()
        except ValueError:
            body = {}
    except requests.RequestException:
        raise TelegramError('UNKNOWN', 'No se pudo confirmar la respuesta de Telegram.') from None
    if not isinstance(body, dict):
        body = {}
    code = body.get('error_code', response.status_code)
    if response.status_code == 200 and body.get('ok') is True:
        return body.get('result')
    if code == 429:
        raise TelegramError('RATE_LIMITED', 'Telegram limitó temporalmente los envíos. Intenta más tarde.')
    if code == 409:
        raise TelegramError('CONFIG_REQUIRED', 'Este bot ya usa otra conexión. Crea un bot exclusivo para tu guía.')
    if code in (400, 401, 403, 404):
        raise TelegramError('CONFIG_REQUIRED', 'Revisa el token y abre el bot en Telegram. Si lo bloqueaste, desbloquéalo.')
    raise TelegramError('FAILED', 'Telegram no confirmó la solicitud.')


def send_telegram(user, message):
    try:
        token = token_for(user)
        if not token or not user.telegram_chat_id:
            raise TelegramError('CONFIG_REQUIRED', 'Conecta tu chat privado de Telegram en Preferencias.')
        result = telegram_api(token, 'sendMessage', {
            'chat_id': user.telegram_chat_id, 'text': message,
            'link_preview_options': {'is_disabled': True},
        })
        if not isinstance(result, dict) or not isinstance(result.get('message_id'), int):
            raise TelegramError('UNKNOWN', 'Telegram respondió sin confirmar el mensaje.')
        status, error = 'ACCEPTED', ''
    except TelegramError as failure:
        status, error = failure.status, failure.detail
    user.telegram_status = status
    user.save(update_fields=['telegram_status'])
    return status, error
