import time
from pathlib import Path
from django.core.management import BaseCommand, call_command
from django.db import close_old_connections


class Command(BaseCommand):
    help = 'Ejecuta recordatorios y registra el pulso del programador cada minuto.'

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            call_command('send_whatsapp_notifications')
            Path('/tmp/life-scheduler-heartbeat').touch()
            time.sleep(60)
