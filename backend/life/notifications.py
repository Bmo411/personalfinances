import datetime
from django.conf import settings
from django.utils import timezone
from .models import NotificationLog
from .quotes import daily_quote
from users.whatsapp import send_whatsapp


def send_meditation_reminder(user, now=None):
    now = timezone.localtime(now or timezone.now())
    if not user.whatsapp_enabled or not user.meditation_reminder_enabled:
        return
    scheduled = timezone.make_aware(datetime.datetime.combine(now.date(), user.meditation_reminder_time))
    if not scheduled <= now < scheduled + datetime.timedelta(hours=2):
        return
    log, claimed = NotificationLog.objects.get_or_create(user=user, channel='WHATSAPP', event_key='meditation:daily', event_date=now.date(), defaults={'status': 'PENDING'})
    if not claimed:
        return
    quote = daily_quote(now.date())
    message = (
        f"Tu pausa de hoy\n\n{quote['text']}\n"
        f"Paráfrasis de {quote['author']} · {quote['work']} {quote['passage']}\n\n"
        f"{quote['question']}\n\nRegistra tu práctica: {settings.PUBLIC_URL}/meditation"
    )
    log.status, log.error = send_whatsapp(user, message)
    log.save(update_fields=['status', 'error'])
