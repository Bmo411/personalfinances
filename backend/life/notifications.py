import datetime
from django.conf import settings
from django.utils import timezone
from .models import NotificationLog
from .quotes import daily_quote
from users.whatsapp import send_whatsapp
from users.telegram import send_telegram, token_for


def meditation_message(date):
    quote = daily_quote(date)
    return (
        f"Tu pausa de hoy\n\n{quote['text']}\n"
        f"Paráfrasis de {quote['author']} · {quote['work']} {quote['passage']}\n\n"
        f"{quote['question']}\n\nRegistra tu práctica: {settings.PUBLIC_URL}/meditation"
    )


def send_meditation_reminder(user, now=None):
    now = timezone.localtime(now or timezone.now())
    if not user.meditation_reminder_enabled:
        return
    channel = user.meditation_channel
    if channel == 'WHATSAPP' and not user.whatsapp_enabled:
        return
    if channel == 'TELEGRAM' and (not user.telegram_chat_id or not token_for(user)):
        return
    scheduled = timezone.make_aware(datetime.datetime.combine(now.date(), user.meditation_reminder_time))
    if not scheduled <= now < scheduled + datetime.timedelta(hours=2):
        return
    log, claimed = NotificationLog.objects.get_or_create(user=user, channel=channel, event_key='meditation:daily', event_date=now.date(), defaults={'status': 'PENDING'})
    if not claimed:
        return
    send = send_telegram if channel == 'TELEGRAM' else send_whatsapp
    log.status, log.error = send(user, meditation_message(now.date()))
    log.save(update_fields=['status', 'error'])
