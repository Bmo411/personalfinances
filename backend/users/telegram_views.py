import datetime
import hashlib
import hmac
import re
import secrets
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from life.models import NotificationLog
from life.notifications import meditation_message
from .telegram import TelegramError, encrypt_token, telegram_api, token_for, send_telegram

User = get_user_model()


class BotInput(serializers.Serializer):
    token = serializers.CharField(write_only=True, max_length=160, required=False)


def failure_response(user, error):
    User.objects.filter(pk=user.pk).update(telegram_status=error.status)
    return Response({'status': error.status, 'detail': error.detail}, status=502)


class TelegramConnectView(APIView):
    def post(self, request):
        payload = BotInput(data=request.data)
        payload.is_valid(raise_exception=True)
        user = request.user
        token = payload.validated_data.get('token') or token_for(user)
        try:
            bot = telegram_api(token, 'getMe')
            if not isinstance(bot, dict) or bot.get('is_bot') is not True or not re.fullmatch(r'[A-Za-z0-9_]{5,64}', bot.get('username', '')):
                raise TelegramError('CONFIG_REQUIRED', 'Telegram no confirmó la identidad de tu bot.')
        except TelegramError as error:
            return failure_response(user, error)
        nonce = secrets.token_urlsafe(24)
        expires_at = timezone.now() + datetime.timedelta(minutes=10)
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            if token == token_for(user) and user.telegram_chat_id:
                user.telegram_status = 'CONNECTED'
                user.save(update_fields=['telegram_status'])
                return Response({'linked': True, 'bot_username': user.telegram_bot_username})
            user.telegram_token_encrypted = encrypt_token(token)
            user.telegram_bot_username = bot['username']
            user.telegram_chat_id = None
            user.telegram_status = 'PENDING'
            user.telegram_link_digest = hashlib.sha256(nonce.encode()).hexdigest()
            user.telegram_link_expires_at = expires_at
            user.save(update_fields=['telegram_token_encrypted', 'telegram_bot_username', 'telegram_chat_id', 'telegram_status', 'telegram_link_digest', 'telegram_link_expires_at'])
        return Response({'linked': False, 'link': f'https://t.me/{bot["username"]}?start={nonce}', 'expires_at': expires_at, 'bot_username': bot['username']})


class TelegramConfirmView(APIView):
    def post(self, request):
        user = request.user
        if user.telegram_chat_id and not user.telegram_link_digest:
            return Response({'linked': True})
        if not user.telegram_link_digest or not user.telegram_link_expires_at or user.telegram_link_expires_at <= timezone.now():
            return Response({'detail': 'El enlace venció. Genera otro enlace de conexión.'}, status=400)
        try:
            # No offset: leave existing bot updates intact. Only a fresh private
            # /start matching this account's one-time nonce can bind the chat.
            updates = telegram_api(token_for(user), 'getUpdates', {'timeout': 0, 'limit': 100})
        except TelegramError as error:
            return failure_response(user, error)
        for update in updates if isinstance(updates, list) else []:
            message = update.get('message', {})
            chat, sender = message.get('chat', {}), message.get('from', {})
            match = re.fullmatch(r'/start(?:@' + re.escape(user.telegram_bot_username) + r')? ([A-Za-z0-9_-]{20,64})', message.get('text', ''))
            if not match or chat.get('type') != 'private' or not isinstance(chat.get('id'), int) or chat['id'] <= 0 or chat['id'] != sender.get('id') or sender.get('is_bot'):
                continue
            sent = message.get('date', 0)
            if not isinstance(sent, int) or not int(user.telegram_link_expires_at.timestamp()) - 600 <= sent <= timezone.now().timestamp() + 30:
                continue
            digest = hashlib.sha256(match[1].encode()).hexdigest()
            if not hmac.compare_digest(digest, user.telegram_link_digest):
                continue
            with transaction.atomic():
                current = User.objects.select_for_update().get(pk=user.pk)
                if not current.telegram_link_expires_at or current.telegram_link_expires_at <= timezone.now() or current.telegram_link_digest != user.telegram_link_digest:
                    return Response({'detail': 'El enlace cambió o venció. Vuelve a conectar.'}, status=400)
                current.telegram_chat_id = chat['id']
                current.telegram_status = 'CONNECTED'
                current.telegram_link_digest = ''
                current.telegram_link_expires_at = None
                current.save(update_fields=['telegram_chat_id', 'telegram_status', 'telegram_link_digest', 'telegram_link_expires_at'])
            return Response({'linked': True})
        return Response({'detail': 'Todavía no encuentro tu inicio. Abre el enlace, pulsa Iniciar en el bot y vuelve a comprobar.'}, status=400)


class TelegramDisconnectView(APIView):
    def post(self, request):
        values = {'telegram_token_encrypted': '', 'telegram_chat_id': None, 'telegram_bot_username': '', 'telegram_link_digest': '', 'telegram_link_expires_at': None, 'telegram_status': 'UNCONFIGURED'}
        if request.user.meditation_channel == 'TELEGRAM':
            values['meditation_reminder_enabled'] = False
        User.objects.filter(pk=request.user.pk).update(**values)
        return Response({'disconnected': True})


class TelegramTestView(APIView):
    def post(self, request):
        try:
            request_id = uuid.UUID(request.headers.get('Idempotency-Key', ''))
        except (ValueError, TypeError):
            return Response({'detail': 'Envía un UUID en Idempotency-Key.'}, status=400)
        if not request.user.telegram_chat_id or not token_for(request.user):
            return Response({'detail': 'Primero conecta tu chat privado de Telegram.'}, status=400)
        log, claimed = NotificationLog.objects.get_or_create(user=request.user, channel='TELEGRAM', event_key=f'telegram:test:{request_id}', event_date=timezone.localdate(), defaults={'status': 'PENDING'})
        if claimed:
            log.status, log.error = send_telegram(request.user, 'Prueba de tu guía de vida\n\n' + meditation_message(timezone.localdate()))
            log.save(update_fields=['status', 'error'])
        if log.status == 'ACCEPTED':
            return Response({'status': log.status, 'message': 'Telegram confirmó el envío. Comprueba que recibiste tu frase de prueba.'})
        return Response({'status': log.status, 'detail': log.error or 'Hay un envío pendiente de confirmación. No se repitió la solicitud.'}, status=502)
