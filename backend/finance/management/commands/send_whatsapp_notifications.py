import datetime
import calendar
import time
import requests as http_requests
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from finance.models import RecurringExpense


User = get_user_model()
NOTIFY_DAYS = [7, 3]  # Days before due date to send reminders


class Command(BaseCommand):
    help = 'Send WhatsApp reminders for upcoming recurring expenses (run daily)'

    def handle(self, *args, **options):
        today = datetime.date.today()
        self.stdout.write(f'[{today}] Checking recurring expense notifications...')

        # Only users who have WhatsApp notifications enabled and configured
        users = User.objects.filter(
            whatsapp_enabled=True,
            whatsapp_phone__isnull=False,
            whatsapp_apikey__isnull=False,
        ).exclude(whatsapp_phone='').exclude(whatsapp_apikey='')

        if not users.exists():
            self.stdout.write('No users with WhatsApp notifications enabled.')
            return

        for user in users:
            expenses = RecurringExpense.objects.filter(user=user, is_active=True)

            for expense in expenses:
                # Skip if already paid this month
                if expense.last_paid_date:
                    lp = expense.last_paid_date
                    if lp.month == today.month and lp.year == today.year:
                        continue

                # Calculate actual due date this month (handle months with fewer days)
                last_day_of_month = calendar.monthrange(today.year, today.month)[1]
                due_day = min(expense.due_day, last_day_of_month)
                due_date = today.replace(day=due_day)

                # If due date already passed this month, skip
                if due_date < today:
                    continue

                days_until = (due_date - today).days

                if days_until in NOTIFY_DAYS:
                    self._send_notification(user, expense, days_until)

        self.stdout.write('Done.')

    def _send_notification(self, user, expense, days_until):
        if days_until == 1:
            days_text = 'mañana'
        else:
            days_text = f'en {days_until} días'

        message = (
            f'⚠️ Recordatorio de pago\n'
            f'*{expense.name}* se cobra {days_text} '
            f'(día {expense.due_day}) por ${float(expense.amount):,.2f}.\n'
            f'Entra a tu app de finanzas para registrarlo. 💸'
        )

        try:
            resp = http_requests.get(
                'https://api.callmebot.com/whatsapp.php',
                params={
                    'phone': user.whatsapp_phone.strip().replace('+', ''),
                    'text': message,
                    'apikey': user.whatsapp_apikey.strip(),
                },
                timeout=15,
            )
            status = 'OK' if resp.status_code == 200 else f'ERROR {resp.status_code}'
            self.stdout.write(
                f'  [{status}] {user.username} → {expense.name} (en {days_until} días)'
            )
        except http_requests.exceptions.RequestException as e:
            self.stdout.write(
                f'  [FAIL] {user.username} → {expense.name}: {e}'
            )
