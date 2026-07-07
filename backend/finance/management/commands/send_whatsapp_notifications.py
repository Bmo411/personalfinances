import calendar
import datetime
from decimal import Decimal

import requests as http_requests
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from finance.credit_cards import build_credit_card_buckets, next_pending_credit_bucket
from finance.models import Account, RecurringExpense, RecurringIncome, Transaction
from life.models import Lesson, NotificationLog, Student, WorkTask
from life.services import build_month_summary


User = get_user_model()
NOTIFY_DAYS = [7, 3, 1, 0]
DAILY_SUMMARY_HOURS = range(6, 11)


class Command(BaseCommand):
    help = 'Send WhatsApp reminders for finances, classes, tasks and monthly focus.'

    def handle(self, *args, **options):
        today = timezone.localdate()
        now = timezone.localtime()
        self.stdout.write(f'[{today}] Checking WhatsApp notifications...')

        for user in User.objects.filter(is_active=True):
            self._process_recurring_incomes(user, today)

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
            self._notify_life_daily_summary(user, today, now)
            self._notify_life_events(user, today, now)

        self.stdout.write('Done.')

    def _process_recurring_incomes(self, user, today):
        incomes = RecurringIncome.objects.filter(user=user, is_active=True, auto_create=True)

        for income in incomes:
            due_date = self._next_date_for_day(income.due_day, today)
            if not due_date or due_date != today:
                continue

            if income.last_received_date:
                received = income.last_received_date
                if received.month == due_date.month and received.year == due_date.year:
                    continue

            Transaction.objects.create(
                user=user,
                type='IN',
                account=income.account,
                category=income.category,
                amount=income.amount,
                date=due_date,
                description=f'Ingreso fijo automatico: {income.name}',
                payment_method='TRANSFER',
            )

            income.last_received_date = due_date
            income.save()
            self.stdout.write(f'  [AUTO] {user.username} -> recurring income {income.name} (${float(income.amount):,.2f})')

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
                self._send_once(
                    user,
                    message,
                    f'{expense.name} payment',
                    f'finance:recurring-expense:{expense.id}:{days_until}',
                    due_date,
                    days_until,
                )

    def _notify_credit_cards(self, user, today):
        cards = Account.objects.filter(user=user, is_active=True, type='CREDIT')

        for card in cards:
            bucket_data = build_credit_card_buckets(user, card)
            self._maybe_send_card_cut(user, card, today, bucket_data)
            self._maybe_send_card_payment(user, card, today)

    def _maybe_send_card_cut(self, user, card, today, bucket_data):
        event_date = self._next_date_for_day(card.statement_cut_day, today)
        if not event_date:
            return

        days_until = (event_date - today).days
        if days_until not in NOTIFY_DAYS:
            return

        cut_amount = sum(
            (bucket['purchases_total'] for bucket in bucket_data['buckets'] if bucket['statement_date'] == event_date),
            Decimal('0.00'),
        )
        message = (
            f'*Corte de tarjeta*\n'
            f'{card.name} corta {self._days_text(days_until)} '
            f'({event_date.strftime("%d/%m/%Y")}).\n'
            f'Compras estimadas en ese corte: ${float(cut_amount):,.2f}.'
        )
        self._send_once(
            user,
            message,
            f'{card.name} corte',
            f'finance:card-cut:{card.id}:{days_until}',
            event_date,
            days_until,
        )

    def _maybe_send_card_payment(self, user, card, today):
        bucket = next_pending_credit_bucket(user, card, today)
        if not bucket:
            return

        event_date = bucket['due_date']
        days_until = (event_date - today).days
        if days_until not in NOTIFY_DAYS:
            return

        message = (
            f'*Pago de tarjeta*\n'
            f'{card.name} vence {self._days_text(days_until)} '
            f'({event_date.strftime("%d/%m/%Y")}).\n'
            f'Monto pendiente del estado: ${float(bucket["pending"]):,.2f}.'
        )
        self._send_once(
            user,
            message,
            f'{card.name} pago',
            f'finance:card-payment:{card.id}:{event_date}:{days_until}',
            event_date,
            days_until,
        )

    def _notify_life_daily_summary(self, user, today, now):
        if now.hour not in DAILY_SUMMARY_HOURS:
            return

        summary = build_month_summary(user)
        counts = summary['counts']
        lines = [
            '*Resumen de Mi Mes*',
            f'Hoy: {counts["active_students"]} alumnos activos, {counts["open_tasks"]} pendientes abiertos.',
            f'Para hoy: {len(summary["today_lessons"])} clases y {len(summary["today_tasks"])} tareas.',
        ]

        if counts['overdue_tasks']:
            lines.append(f'Urgente: {counts["overdue_tasks"]} tareas vencidas.')
        if counts['follow_up_students']:
            lines.append(f'Alumnos por seguir: {counts["follow_up_students"]}.')

        first_lesson = summary['today_lessons'][0] if summary['today_lessons'] else None
        if first_lesson:
            lines.append(f'Primera clase: {first_lesson.student.name} a las {timezone.localtime(first_lesson.scheduled_at).strftime("%H:%M")}.')

        first_task = summary['today_tasks'][0] if summary['today_tasks'] else None
        if first_task:
            lines.append(f'Pendiente clave: {first_task.title}.')

        focus = summary['focus']
        if focus.company_focus:
            lines.append(f'Empresa: {self._trim(focus.company_focus)}')
        elif focus.skills_focus:
            lines.append(f'Habilidad: {self._trim(focus.skills_focus)}')

        self._send_once(
            user,
            '\n'.join(lines),
            'Mi Mes daily summary',
            'life:daily-summary',
            today,
            0,
        )

    def _notify_life_events(self, user, today, now):
        self._notify_lesson_reminders(user, now)
        self._notify_task_reminders(user, today, now)
        self._notify_student_followups(user, today)

    def _notify_lesson_reminders(self, user, now):
        lessons = Lesson.objects.filter(
            user=user,
            status='SCHEDULED',
            reminder_enabled=True,
            scheduled_at__gte=now,
            scheduled_at__lte=now + datetime.timedelta(days=2),
        ).select_related('student')

        for lesson in lessons:
            reminder_at = lesson.scheduled_at - datetime.timedelta(minutes=lesson.reminder_minutes or 0)
            if now < reminder_at:
                continue

            local_time = timezone.localtime(lesson.scheduled_at)
            message = (
                f'*Clase proxima*\n'
                f'{lesson.student.name} - {lesson.topic}\n'
                f'{local_time.strftime("%d/%m/%Y %H:%M")}\n'
            )
            if lesson.homework:
                message += f'Seguimiento: {self._trim(lesson.homework)}'

            self._send_once(
                user,
                message,
                f'lesson {lesson.id}',
                f'life:lesson:{lesson.id}:reminder',
                local_time.date(),
                0,
            )

    def _notify_task_reminders(self, user, today, now):
        tasks = WorkTask.objects.filter(
            user=user,
            status__in=['PENDING', 'IN_PROGRESS'],
            due_at__isnull=False,
        )

        for task in tasks:
            local_due = timezone.localtime(task.due_at)
            if task.due_at < now:
                message = (
                    f'*Tarea vencida*\n'
                    f'{task.title}\n'
                    f'Vencia: {local_due.strftime("%d/%m/%Y %H:%M")}\n'
                    f'Prioridad: {task.get_priority_display()}'
                )
                self._send_once(
                    user,
                    message,
                    f'overdue task {task.id}',
                    f'life:task:{task.id}:overdue',
                    today,
                    0,
                )
                continue

            if not task.reminder_enabled:
                continue

            reminder_at = task.due_at - datetime.timedelta(minutes=task.reminder_minutes or 0)
            if now < reminder_at:
                continue

            message = (
                f'*Tarea proxima*\n'
                f'{task.title}\n'
                f'Vence: {local_due.strftime("%d/%m/%Y %H:%M")}\n'
                f'Area: {task.get_area_display()}'
            )
            self._send_once(
                user,
                message,
                f'task {task.id}',
                f'life:task:{task.id}:reminder',
                local_due.date(),
                0,
            )

    def _notify_student_followups(self, user, today):
        students = Student.objects.filter(
            user=user,
            status='ACTIVE',
            next_follow_up__isnull=False,
            next_follow_up__lte=today,
        ).order_by('next_follow_up', 'name')

        for student in students:
            message = (
                f'*Seguimiento de alumno*\n'
                f'{student.name}'
            )
            if student.subject:
                message += f' - {student.subject}'
            if student.goal:
                message += f'\nObjetivo: {self._trim(student.goal)}'

            self._send_once(
                user,
                message,
                f'student follow-up {student.id}',
                f'life:student:{student.id}:follow-up',
                today,
                0,
            )

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

    def _trim(self, value, length=90):
        clean = ' '.join((value or '').split())
        if len(clean) <= length:
            return clean
        return f'{clean[:length - 3]}...'

    def _send_once(self, user, message, label, event_key, event_date, days_until):
        exists = NotificationLog.objects.filter(
            user=user,
            channel='WHATSAPP',
            event_key=event_key,
            event_date=event_date,
        ).exists()
        if exists:
            self.stdout.write(f'  [SKIP] {user.username} -> {label} already sent')
            return

        if self._send_callmebot(user, message, label, days_until):
            NotificationLog.objects.get_or_create(
                user=user,
                channel='WHATSAPP',
                event_key=event_key,
                event_date=event_date,
            )

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
            return resp.status_code == 200
        except http_requests.exceptions.RequestException as exc:
            self.stdout.write(f'  [FAIL] {user.username} -> {label}: {exc}')
            return False
