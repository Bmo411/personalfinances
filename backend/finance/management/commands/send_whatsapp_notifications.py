import calendar
import datetime
from decimal import Decimal

import requests as http_requests
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Sum

from finance.models import Account, RecurringExpense, Transaction


User = get_user_model()
NOTIFY_DAYS = [7, 3, 1, 0]


class Command(BaseCommand):
    help = 'Send WhatsApp reminders for recurring expenses and credit card dates.'

    def handle(self, *args, **options):
        today = datetime.date.today()
        self.stdout.write(f'[{today}] Checking WhatsApp notifications...')

        users = User.objects.filter(
            whatsapp_enabled=True,
            whatsapp_phone__isnull=False,
            whatsapp_apikey__isnull=False,
        ).exclude(whatsapp_phone='').exclude(whatsapp_apikey='')

        if not users.exists():
            self.stdout.write('No users with WhatsApp notifications enabled.')
            return

        for user in users:
            self._notify_recurring_expenses(user, today)
            self._notify_credit_cards(user, today)

        self.stdout.write('Done.')

    def _notify_recurring_expenses(self, user, today):
        expenses = RecurringExpense.objects.filter(user=user, is_active=True)

        for expense in expenses:
            due_date = self._next_date_for_day(expense.due_day, today)
            if not due_date:
                continue

            if expense.last_paid_date:
                paid = expense.last_paid_date
                if paid.month == due_date.month and paid.year == due_date.year:
                    continue

            days_until = (due_date - today).days
            if days_until in NOTIFY_DAYS:
                message = (
                    f'*Recordatorio de pago*\n'
                    f'{expense.name} se cobra {self._days_text(days_until)} '
                    f'({due_date.strftime("%d/%m/%Y")}) por ${float(expense.amount):,.2f}.\n'
                    f'Entra a FinanceFlow para registrarlo.'
                )
                self._send_callmebot(user, message, f'{expense.name} payment', days_until)

    def _notify_credit_cards(self, user, today):
        cards = Account.objects.filter(user=user, is_active=True, type='CREDIT')

        for card in cards:
            debt = self._credit_card_debt(user, card)

            self._maybe_send_card_date(
                user=user,
                card=card,
                day=card.statement_cut_day,
                today=today,
                event_label='corte',
                debt=debt,
            )

            if debt > Decimal('0.00'):
                self._maybe_send_card_date(
                    user=user,
                    card=card,
                    day=card.payment_due_day,
                    today=today,
                    event_label='pago',
                    debt=debt,
                )

    def _maybe_send_card_date(self, user, card, day, today, event_label, debt):
        event_date = self._next_date_for_day(day, today)
        if not event_date:
            return

        days_until = (event_date - today).days
        if days_until not in NOTIFY_DAYS:
            return

        if event_label == 'corte':
            message = (
                f'*Corte de tarjeta*\n'
                f'{card.name} corta {self._days_text(days_until)} '
                f'({event_date.strftime("%d/%m/%Y")}).\n'
                f'Deuda actual registrada: ${float(debt):,.2f}.'
            )
        else:
            message = (
                f'*Pago de tarjeta*\n'
                f'{card.name} vence {self._days_text(days_until)} '
                f'({event_date.strftime("%d/%m/%Y")}).\n'
                f'Deuda actual registrada: ${float(debt):,.2f}.'
            )

        self._send_callmebot(user, message, f'{card.name} {event_label}', days_until)

    def _credit_card_debt(self, user, card):
        card_txs = Transaction.objects.filter(user=user, is_deleted=False, account=card)
        incomes = card_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        expenses = card_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        calculated_balance = card.balance + incomes - expenses
        return max(Decimal('0.00'), -calculated_balance)

    def _next_date_for_day(self, day, today):
        if not day:
            return None

        current_month_date = self._date_for_day(today.year, today.month, day)
        if current_month_date >= today:
            return current_month_date

        return self._date_for_day(today.year, today.month + 1, day)

    def _date_for_day(self, year, month, day):
        year += (month - 1) // 12
        month = ((month - 1) % 12) + 1
        last_day = calendar.monthrange(year, month)[1]
        return datetime.date(year, month, min(day, last_day))

    def _days_text(self, days_until):
        if days_until == 0:
            return 'hoy'
        if days_until == 1:
            return 'manana'
        return f'en {days_until} dias'

    def _send_callmebot(self, user, message, label, days_until):
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
            self.stdout.write(f'  [{status}] {user.username} -> {label} ({self._days_text(days_until)})')
        except http_requests.exceptions.RequestException as exc:
            self.stdout.write(f'  [FAIL] {user.username} -> {label}: {exc}')
