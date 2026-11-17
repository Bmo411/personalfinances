from django.contrib.auth.models import AbstractUser
from django.db import models
import datetime

class User(AbstractUser):
    # Hereda username, email, password
    whatsapp_phone = models.CharField(max_length=20, blank=True, null=True, help_text="Phone in international format: +521234567890")
    whatsapp_apikey = models.CharField(max_length=100, blank=True, null=True)
    whatsapp_enabled = models.BooleanField(default=False)
    meditation_reminder_enabled = models.BooleanField(default=False)
    meditation_reminder_time = models.TimeField(default=datetime.time(7, 0))
    meditation_channel = models.CharField(max_length=10, choices=[('WHATSAPP', 'WhatsApp'), ('TELEGRAM', 'Telegram')], default='WHATSAPP')
    whatsapp_status = models.CharField(max_length=24, default='UNVERIFIED')
    telegram_token_encrypted = models.TextField(blank=True)
    telegram_bot_username = models.CharField(max_length=64, blank=True)
    telegram_chat_id = models.BigIntegerField(null=True, blank=True)
    telegram_status = models.CharField(max_length=24, default='UNCONFIGURED')
    telegram_link_digest = models.CharField(max_length=64, blank=True)
    telegram_link_expires_at = models.DateTimeField(null=True, blank=True)
