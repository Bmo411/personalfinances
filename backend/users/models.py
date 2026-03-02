from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Hereda username, email, password
    whatsapp_phone = models.CharField(max_length=20, blank=True, null=True, help_text="Phone in international format: +521234567890")
    whatsapp_apikey = models.CharField(max_length=100, blank=True, null=True)
    whatsapp_enabled = models.BooleanField(default=False)
