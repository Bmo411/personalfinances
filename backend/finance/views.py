import calendar
import datetime
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction as db_transaction
from django.db.models import Q, Sum
from django.db.models.functions import TruncMonth
from django.utils.dateparse import parse_date
from .models import Category, Transaction, SavingsGoal, Debt, Account, RecurringExpense, RecurringIncome, FinancialProfile
from .serializers import CategorySerializer, TransactionSerializer, SavingsGoalSerializer, DebtSerializer, AccountSerializer, RecurringExpenseSerializer, RecurringIncomeSerializer, FinancialProfileSerializer
from .credit_cards import (
    build_credit_card_buckets,
    credit_card_debt as calculate_credit_card_debt,
    credit_statement_and_due_dates,
    next_pending_credit_bucket,
)

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user, is_deleted=False)
        month = self.request.query_params.get('month', None)
        year = self.request.query_params.get('year', None)
        date_from = parse_date(self.request.query_params.get('date_from', '') or '')
        date_to = parse_date(self.request.query_params.get('date_to', '') or '')
        month_year = self._parse_month_year(month, year)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if not date_from and not date_to and month_year:
            month_int, year_int = month_year
            queryset = queryset.filter(date__year=year_int, date__month=month_int)
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        spending_kind = serializer.validated_data.get('spending_kind')
        transaction_type = serializer.validated_data.get('type')
        save_kwargs = {'user': self.request.user}
        if transaction_type == 'OUT' and not spending_kind:
            save_kwargs['spending_kind'] = 'NECESSARY'

        save_kwargs.update(self._credit_date_defaults(serializer.validated_data))
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        recalculate_credit_dates = any(field in serializer.validated_data for field in ['type', 'account', 'date'])
        values = {
            'type': serializer.instance.type,
            'account': serializer.instance.account,
            'date': serializer.instance.date,
            'credit_statement_date': serializer.instance.credit_statement_date,
            'credit_due_date': serializer.instance.credit_due_date,
        }
        values.update(serializer.validated_data)

        save_kwargs = {}
        if 'credit_statement_date' in serializer.validated_data:
            values['credit_statement_date'] = serializer.validated_data.get('credit_statement_date')
        elif recalculate_credit_dates:
            values['credit_statement_date'] = None
        if 'credit_due_date' in serializer.validated_data:
            values['credit_due_date'] = serializer.validated_data.get('credit_due_date')
        elif recalculate_credit_dates:
            values['credit_due_date'] = None

        save_kwargs.update(self._credit_date_defaults(values))
        serializer.save(**save_kwargs)

    def _credit_date_defaults(self, values):
        transaction_type = values.get('type')
        account = values.get('account')
        transaction_date = values.get('date')

        if transaction_type != 'OUT' or not account or account.type != 'CREDIT':
            return {}

        statement_date, due_date = credit_statement_and_due_dates(
            transaction_date,
            account.statement_cut_day,
            account.payment_due_day,
        )
        if not statement_date or not due_date:
            return {}

        defaults = {}
        if not values.get('credit_statement_date'):
            defaults['credit_statement_date'] = statement_date
        if not values.get('credit_due_date'):
            defaults['credit_due_date'] = due_date
        return defaults

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        
        # Omit transfers from net income/expense calculations
        incomes = queryset.filter(type='IN', is_transfer=False).aggregate(Sum('amount'))['amount__sum'] or 0
        expenses = queryset.filter(type='OUT', is_transfer=False).aggregate(Sum('amount'))['amount__sum'] or 0
        credit_card_expense = queryset.filter(type='OUT', is_transfer=False, account__type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
        
        expenses_by_category = queryset.filter(type='OUT', is_transfer=False).values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')
        incomes_by_category = queryset.filter(type='IN', is_transfer=False).values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')
        
        # Calculate exactly how much money we have physically or in the bank by matching Accounts against Transactions
        accounts = Account.objects.filter(user=self.request.user)
        accounts_data = []
        liquid_balance = Decimal('0.00')
        savings_balance = Decimal('0.00')
        credit_card_debt = Decimal('0.00')
        credit_available = Decimal('0.00')
        net_worth = Decimal('0.00')

        for account in accounts:
            # We must sum all incomes towards this account and subtract all expenses from it
            # Initial balance + (Incomes) - (Expenses)
            # IMPORTANT: For account balances, we MUST include transfers, so we query the DB directly, not the filtered queryset!
            # AND we MUST NOT filter by date, because an account balance is the sum of ALL history.
            account_txs = Transaction.objects.filter(user=self.request.user, is_deleted=False, account=account)
            
            acc_incomes = account_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or 0
            acc_expenses = account_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or 0
            
            calculated_balance = account.balance + acc_incomes - acc_expenses
            net_worth += calculated_balance

            if account.type in ['CASH', 'DEBIT']:
                liquid_balance += calculated_balance
            elif account.type == 'SAVINGS':
                savings_balance += calculated_balance
            elif account.type == 'CREDIT':
                card_debt = max(Decimal('0.00'), -calculated_balance)
                credit_card_debt += card_debt
                credit_available += max(Decimal('0.00'), account.credit_limit - card_debt)

            accounts_data.append({
                'id': account.id,
                'name': account.name,
                'type': account.type,
                'color': account.color,
                'is_active': account.is_active,
                'balance': account.balance,
                'credit_limit': account.credit_limit,
                'statement_cut_day': account.statement_cut_day,
                'payment_due_day': account.payment_due_day,
                'calculated_balance': calculated_balance
            })
            
        # Calculate upcoming fixed expenses for the current month
        today = datetime.date.today()
        recurring_expenses = RecurringExpense.objects.filter(user=self.request.user, is_active=True)
        upcoming_fixed_expenses = 0
        for expense in recurring_expenses:
            # Check if it was already paid this month
            if expense.last_paid_date and expense.last_paid_date.year == today.year and expense.last_paid_date.month == today.month:
                continue # Already paid
            
            # If not paid, consider it upcoming or past due
            upcoming_fixed_expenses += expense.amount

        recurring_incomes = RecurringIncome.objects.filter(user=self.request.user, is_active=True)
        upcoming_fixed_incomes = 0
        for income in recurring_incomes:
            if income.last_received_date and income.last_received_date.year == today.year and income.last_received_date.month == today.month:
                continue

            upcoming_fixed_incomes += income.amount
            
        trend_start, trend_end, period_mode = self._get_summary_period_bounds(request)
        expense_trend = self._build_expense_trend(queryset, trend_start, trend_end)
        profile, _ = FinancialProfile.objects.get_or_create(user=self.request.user)
        outing_budget = Decimal(str(profile.monthly_outing_budget or '0.00'))

        payable_debt = Debt.objects.filter(
            user=self.request.user,
            type='I_OWE',
            is_settled=False,
        ).aggregate(Sum('remaining_amount'))['remaining_amount__sum'] or Decimal('0.00')
        receivable_debt = Debt.objects.filter(
            user=self.request.user,
            type='OWED_TO_ME',
            is_settled=False,
        ).aggregate(Sum('remaining_amount'))['remaining_amount__sum'] or Decimal('0.00')
        total_debt = payable_debt + credit_card_debt
        future_liquidity = liquid_balance + receivable_debt

        necessary_spent = queryset.filter(type='OUT', is_transfer=False).filter(
            Q(spending_kind='NECESSARY') | Q(spending_kind__isnull=True) | Q(spending_kind='')
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        outing_spent = queryset.filter(type='OUT', is_transfer=False, spending_kind='OUTING').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        impulse_spent = queryset.filter(type='OUT', is_transfer=False, spending_kind='IMPULSE').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        optional_spent = queryset.filter(type='OUT', is_transfer=False, spending_kind='OPTIONAL').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        days_of_freedom = self._days_of_freedom(self.request.user, liquid_balance)
        emergency_fund = self._emergency_fund_status(self.request.user, profile, savings_balance, days_of_freedom)
        days_without_impulse = self._days_without_impulse(self.request.user, today)
        upcoming_payment = self._next_important_payment(self.request.user, today)
        cashflow_projection = self._cashflow_projection(self.request.user, today, liquid_balance)
        net_worth_history = self._net_worth_history(self.request.user, today)
        debt_progress = self._debt_progress(self.request.user)
        financial_score = self._financial_score(
            liquid_balance=liquid_balance,
            net_worth=net_worth,
            total_debt=total_debt,
            total_income=Decimal(str(incomes)),
            total_expense=Decimal(str(expenses)),
            emergency_percent=emergency_fund['percent'],
            impulse_spent=impulse_spent,
            days_without_impulse=days_without_impulse,
            days_of_freedom=days_of_freedom,
        )
            
        return Response({
            'balance': incomes - expenses,
            'total_income': incomes,
            'total_expense': expenses,
            'credit_card_expense': credit_card_expense,
            'liquid_balance': liquid_balance,
            'savings_balance': savings_balance,
            'credit_card_debt': credit_card_debt,
            'credit_available': credit_available,
            'net_worth': net_worth,
            'total_debt': total_debt,
            'payable_debt': payable_debt,
            'receivable_debt': receivable_debt,
            'future_liquidity': future_liquidity,
            'emergency_fund': emergency_fund,
            'spending_behavior': {
                'necessary': necessary_spent,
                'outing': outing_spent,
                'impulse': impulse_spent,
                'optional': optional_spent,
                'outing_budget': outing_budget,
                'outing_remaining': outing_budget - outing_spent,
                'days_without_impulse': days_without_impulse,
            },
            'upcoming_important_payment': upcoming_payment,
            'cashflow_projection': cashflow_projection,
            'net_worth_history': net_worth_history,
            'debt_progress': debt_progress,
            'financial_score': financial_score,
            'days_of_freedom': days_of_freedom,
            'financial_life': {
                'age': profile.age,
                'weekly_work_hours': profile.weekly_work_hours,
                'current_goal': profile.current_goal,
                'active_income_sources': recurring_incomes.filter(source_type='ACTIVE').count(),
                'passive_income_sources': recurring_incomes.filter(source_type='PASSIVE').count(),
            },
            'expenses_by_category': list(expenses_by_category),
            'incomes_by_category': list(incomes_by_category),
            'accounts': accounts_data,
            'upcoming_fixed_expenses': upcoming_fixed_expenses,
            'upcoming_fixed_incomes': upcoming_fixed_incomes,
            'last_7_days_expenses': expense_trend,
            'expense_trend': expense_trend,
            'period': {
                'mode': period_mode,
                'date_from': trend_start.strftime('%Y-%m-%d'),
                'date_to': trend_end.strftime('%Y-%m-%d'),
            }
        })

    def _get_summary_period_bounds(self, request):
        today = datetime.date.today()
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        date_from = parse_date(request.query_params.get('date_from', '') or '')
        date_to = parse_date(request.query_params.get('date_to', '') or '')
        month_year = self._parse_month_year(month, year)

        if date_from or date_to:
            start = date_from or date_to
            end = date_to or date_from
            if start > end:
                start, end = end, start
            return start, end, 'range'

        if month_year:
            month_int, year_int = month_year
            start = datetime.date(year_int, month_int, 1)
            if month_int == 12:
                end = datetime.date(year_int, 12, 31)
            else:
                end = datetime.date(year_int, month_int + 1, 1) - datetime.timedelta(days=1)
            return start, end, 'month'

        return today - datetime.timedelta(days=6), today, 'all'

    def _parse_month_year(self, month, year):
        try:
            month_int = int(month)
            year_int = int(year)
        except (TypeError, ValueError):
            return None

        if month_int < 1 or month_int > 12:
            return None

        return month_int, year_int

    def _build_expense_trend(self, queryset, start, end):
        if (end - start).days <= 62:
            trend = []
            current = start
            while current <= end:
                day_txs = queryset.filter(type='OUT', is_transfer=False, date=current)
                day_total = day_txs.aggregate(Sum('amount'))['amount__sum'] or 0
                day_categories = day_txs.values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')

                trend.append({
                    'date': current.strftime('%Y-%m-%d'),
                    'total': day_total,
                    'categories': list(day_categories)
                })
                current += datetime.timedelta(days=1)
            return trend

        monthly = (
            queryset
            .filter(type='OUT', is_transfer=False, date__gte=start, date__lte=end)
            .annotate(period_month=TruncMonth('date'))
            .values('period_month')
            .annotate(total=Sum('amount'))
            .order_by('period_month')
        )

        return [
            {
                'date': item['period_month'].strftime('%Y-%m-%d'),
                'total': item['total'] or 0,
                'categories': []
            }
            for item in monthly
        ]

    def _emergency_fund_status(self, user, profile, savings_balance, days_of_freedom):
        emergency_goal = SavingsGoal.objects.filter(user=user, name__icontains='emerg').order_by('-created_at').first()

        if emergency_goal:
            current = Decimal(str(emergency_goal.current_amount or '0.00'))
            target = Decimal(str(emergency_goal.target_amount or '0.00'))
            source = emergency_goal.name
        else:
            current = max(Decimal('0.00'), Decimal(str(savings_balance or '0.00')))
            target = Decimal(str(profile.emergency_fund_goal or '0.00'))
            source = 'Ahorro e inversiones'

        percent = Decimal('0.00')
        if target and target > Decimal('0.00'):
            percent = min(Decimal('100.00'), (current / target) * Decimal('100.00'))

        monthly_burn = self._average_monthly_expense(user)
        months = None
        if monthly_burn > Decimal('0.00'):
            months = current / monthly_burn

        return {
            'current': current,
            'target': target,
            'percent': percent,
            'months': months,
            'days_of_freedom': days_of_freedom,
            'source': source,
        }

    def _average_monthly_expense(self, user):
        today = datetime.date.today()
        start = today - datetime.timedelta(days=89)
        total = Transaction.objects.filter(
            user=user,
            is_deleted=False,
            type='OUT',
            is_transfer=False,
            date__gte=start,
            date__lte=today,
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        return (total / Decimal('90.00')) * Decimal('30.00')

    def _days_of_freedom(self, user, liquid_balance):
        monthly_burn = self._average_monthly_expense(user)
        daily_burn = monthly_burn / Decimal('30.00') if monthly_burn else Decimal('0.00')

        if daily_burn <= Decimal('0.00'):
            return None

        return max(0, int(liquid_balance / daily_burn))

    def _days_without_impulse(self, user, today):
        latest = Transaction.objects.filter(
            user=user,
            is_deleted=False,
            type='OUT',
            is_transfer=False,
            spending_kind='IMPULSE',
        ).order_by('-date').first()

        if not latest:
            return None

        return max(0, (today - latest.date).days)

    def _next_important_payment(self, user, today):
        events = self._upcoming_cash_events(user, today, days=45)
        payments = [event for event in events if event.get('direction', 'OUT') == 'OUT']
        return payments[0] if payments else None

    def _cashflow_projection(self, user, today, liquid_balance):
        events = self._upcoming_cash_events(user, today, days=45)
        points = [{
            'date': today.strftime('%Y-%m-%d'),
            'label': 'Hoy',
            'amount': Decimal('0.00'),
            'balance_after': liquid_balance,
            'kind': 'START',
        }]

        running_balance = liquid_balance
        for event in events[:8]:
            if event.get('direction') == 'IN':
                running_balance += event['amount']
            else:
                running_balance -= event['amount']
            points.append({
                **event,
                'balance_after': running_balance,
            })

        return points

    def _upcoming_cash_events(self, user, today, days=45):
        end = today + datetime.timedelta(days=days)
        events = []

        recurring_expenses = RecurringExpense.objects.filter(user=user, is_active=True)
        for expense in recurring_expenses:
            due_date = self._next_date_for_day(expense.due_day, today)
            if not due_date or due_date > end:
                continue

            if expense.last_paid_date and expense.last_paid_date.year == due_date.year and expense.last_paid_date.month == due_date.month:
                continue

            events.append({
                'date': due_date.strftime('%Y-%m-%d'),
                'label': expense.name,
                'amount': expense.amount,
                'kind': 'RECURRING',
                'direction': 'OUT',
            })

        recurring_incomes = RecurringIncome.objects.filter(user=user, is_active=True)
        for income in recurring_incomes:
            due_date = self._next_date_for_day(income.due_day, today)
            if not due_date or due_date > end:
                continue

            if income.last_received_date and income.last_received_date.year == due_date.year and income.last_received_date.month == due_date.month:
                continue

            events.append({
                'date': due_date.strftime('%Y-%m-%d'),
                'label': income.name,
                'amount': income.amount,
                'kind': 'RECURRING_INCOME',
                'direction': 'IN',
            })

        debts = Debt.objects.filter(user=user, type='I_OWE', is_settled=False, due_date__gte=today, due_date__lte=end)
        for debt in debts:
            events.append({
                'date': debt.due_date.strftime('%Y-%m-%d'),
                'label': debt.name,
                'amount': debt.remaining_amount,
                'kind': 'DEBT',
                'direction': 'OUT',
            })

        cards = Account.objects.filter(user=user, is_active=True, type='CREDIT', payment_due_day__isnull=False)
        for card in cards:
            bucket = next_pending_credit_bucket(user, card, today)
            if not bucket or bucket['pending'] <= Decimal('0.00'):
                continue

            due_date = bucket['due_date']
            if due_date and due_date <= end:
                event_date = due_date if due_date >= today else today
                events.append({
                    'date': event_date.strftime('%Y-%m-%d'),
                    'label': card.name,
                    'amount': bucket['pending'],
                    'kind': 'CREDIT_CARD',
                    'direction': 'OUT',
                    'statement_date': bucket['statement_date'].strftime('%Y-%m-%d') if bucket['statement_date'] else None,
                })

        return sorted(events, key=lambda item: item['date'])

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

    def _credit_card_debt(self, user, card):
        return calculate_credit_card_debt(user, card)

    def _net_worth_history(self, user, today):
        month_names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        first_tx = Transaction.objects.filter(user=user, is_deleted=False).order_by('date').first()

        start_year = today.year
        start_month = today.month - 5
        while start_month <= 0:
            start_month += 12
            start_year -= 1

        if first_tx:
            first_month = datetime.date(first_tx.date.year, first_tx.date.month, 1)
            default_start = datetime.date(start_year, start_month, 1)
            if first_month > default_start:
                start_year = first_month.year
                start_month = first_month.month

        months = []
        year = start_year
        month = start_month
        while datetime.date(year, month, 1) <= datetime.date(today.year, today.month, 1):
            months.append((year, month))
            month += 1
            if month > 12:
                month = 1
                year += 1

        months = months[-12:]
        history = []
        first_value = None
        for year, month in months:
            last_day = calendar.monthrange(year, month)[1]
            end_date = datetime.date(year, month, last_day)
            value = self._net_worth_at(user, end_date)
            if first_value is None:
                first_value = value
            history.append({
                'month': f'{year}-{month:02d}',
                'label': month_names[month - 1],
                'net_worth': value,
                'cumulative_change': value - first_value,
            })

        return history

    def _net_worth_at(self, user, end_date):
        net_worth = Decimal('0.00')
        accounts = Account.objects.filter(user=user, created_at__date__lte=end_date)

        for account in accounts:
            account_txs = Transaction.objects.filter(user=user, is_deleted=False, account=account, date__lte=end_date)
            incomes = account_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
            expenses = account_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
            net_worth += account.balance + incomes - expenses

        return net_worth

    def _debt_progress(self, user):
        debts = Debt.objects.filter(user=user, type='I_OWE', is_settled=False).order_by('due_date', '-created_at')
        progress = []

        for debt in debts[:5]:
            paid = debt.total_amount - debt.remaining_amount
            percent = Decimal('0.00')
            if debt.total_amount > Decimal('0.00'):
                percent = min(Decimal('100.00'), (paid / debt.total_amount) * Decimal('100.00'))

            progress.append({
                'id': debt.id,
                'name': debt.name,
                'total_amount': debt.total_amount,
                'remaining_amount': debt.remaining_amount,
                'paid_amount': paid,
                'percent': percent,
                'due_date': debt.due_date.strftime('%Y-%m-%d') if debt.due_date else None,
            })

        return progress

    def _financial_score(self, liquid_balance, net_worth, total_debt, total_income, total_expense, emergency_percent, impulse_spent, days_without_impulse, days_of_freedom):
        liquidity = self._threshold_score(days_of_freedom or 0, [7, 15, 30, 60, 90])
        savings = self._threshold_score(float(emergency_percent), [10, 25, 50, 75, 100])

        if total_debt <= Decimal('0.00'):
            debt = 5
        elif total_income <= Decimal('0.00'):
            debt = 1
        else:
            debt_ratio = total_debt / max(total_income, Decimal('1.00'))
            if debt_ratio <= Decimal('1.00'):
                debt = 4
            elif debt_ratio <= Decimal('3.00'):
                debt = 3
            elif debt_ratio <= Decimal('6.00'):
                debt = 2
            else:
                debt = 1

        if net_worth >= Decimal('0.00'):
            net_worth_score = self._threshold_score(float(net_worth), [1, 5000, 15000, 50000, 100000])
        else:
            net_worth_score = 1 if net_worth < Decimal('-10000.00') else 2

        if total_expense <= Decimal('0.00'):
            discipline = 4
        else:
            impulse_ratio = impulse_spent / max(total_expense, Decimal('1.00'))
            discipline = 5
            if impulse_ratio > Decimal('0.05'):
                discipline -= 1
            if impulse_ratio > Decimal('0.15'):
                discipline -= 1
            if days_without_impulse is not None and days_without_impulse < 7:
                discipline -= 1
            discipline = max(1, discipline)

        components = {
            'liquidity': liquidity,
            'debt': debt,
            'savings': savings,
            'net_worth': net_worth_score,
            'discipline': discipline,
        }
        total = round((sum(components.values()) / 25) * 100)

        return {
            'total': total,
            'components': components,
        }

    def _threshold_score(self, value, thresholds):
        score = 0
        for threshold in thresholds:
            if value >= threshold:
                score += 1
        return max(1, min(5, score))

    @action(detail=False, methods=['post'])
    def transfer(self, request):
        from_account_id = request.data.get('from_account')
        to_account_id = request.data.get('to_account')
        amount = request.data.get('amount')
        date = request.data.get('date', datetime.date.today())
        description = request.data.get('description', '')

        if not from_account_id or not to_account_id or not amount:
            return Response({'error': 'from_account, to_account and amount are required'}, status=400)

        if str(from_account_id) == str(to_account_id):
            return Response({'error': 'Cannot transfer to the same account'}, status=400)

        try:
            amount = Decimal(str(amount))
            if amount <= Decimal('0.00'):
                return Response({'error': 'Amount must be positive'}, status=400)
        except (InvalidOperation, ValueError):
            return Response({'error': 'Invalid amount'}, status=400)

        user = self.request.user
        
        from_acc = Account.objects.filter(id=from_account_id, user=user).first()
        to_acc = Account.objects.filter(id=to_account_id, user=user).first()
        
        if not from_acc or not to_acc:
            return Response({'error': 'One or both accounts not found or invalid'}, status=404)

        desc_from = f"Transferencia a {to_acc.name}"
        if description:
            desc_from += f" ({description})"
            
        desc_to = f"Transferencia de {from_acc.name}"
        if description:
            desc_to += f" ({description})"

        Transaction.objects.create(
            user=user,
            type='OUT',
            amount=amount,
            date=date,
            account=from_acc,
            description=desc_from,
            payment_method='TRANSFER',
            is_transfer=True
        )

        Transaction.objects.create(
            user=user,
            type='IN',
            amount=amount,
            date=date,
            account=to_acc,
            description=desc_to,
            payment_method='TRANSFER',
            is_transfer=True
        )

        return Response({'message': 'Transfer successful'})

class SavingsGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user).order_by('target_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    @action(detail=True, methods=['post'])
    def add_funds(self, request, pk=None):
        goal = self.get_object()
        amount = request.data.get('amount')
        
        if not amount:
            return Response({'error': 'Amount must be provided'}, status=400)
            
        try:
            amount = Decimal(str(amount))
            if amount <= Decimal('0.00'):
                return Response({'error': 'Amount must be positive'}, status=400)
        except (InvalidOperation, ValueError):
            return Response({'error': 'Invalid amount'}, status=400)
            
        goal.current_amount += amount
        if goal.current_amount >= goal.target_amount:
            goal.is_completed = True
        goal.save()
        
        # We also need to automatically register an "Expense" to deduct from the main available balance
        account_id = request.data.get('account_id')
        
        Transaction.objects.create(
            user=self.request.user,
            type='OUT',
            account_id=account_id if account_id else None,
            amount=amount,
            date=request.data.get('date') or datetime.date.today(),
            description=f'Depósito a meta de ahorro: {goal.name}',
            payment_method='TRANSFER',
            is_transfer=True # Considered a transfer conceptually, protects from gross expense calculations
        )
        
        return Response(SavingsGoalSerializer(goal).data)

    @action(detail=True, methods=['post'])
    def withdraw_funds(self, request, pk=None):
        goal = self.get_object()
        amount = request.data.get('amount')
        
        if not amount:
            return Response({'error': 'Amount must be provided'}, status=400)
            
        try:
            amount = Decimal(str(amount))
            if amount <= Decimal('0.00'):
                return Response({'error': 'Amount must be positive'}, status=400)
        except (InvalidOperation, ValueError):
            return Response({'error': 'Invalid amount'}, status=400)
            
        if amount > goal.current_amount:
            return Response({'error': 'Cannot withdraw more than current amount'}, status=400)
            
        goal.current_amount -= amount
        if goal.current_amount < goal.target_amount:
            goal.is_completed = False
        goal.save()
        
        # Register an "Income" to add back to the main available balance
        account_id = request.data.get('account_id')
        
        Transaction.objects.create(
            user=self.request.user,
            type='IN',
            account_id=account_id if account_id else None,
            amount=amount,
            date=request.data.get('date') or datetime.date.today(),
            description=f'Retiro de meta de ahorro: {goal.name}',
            payment_method='TRANSFER',
            is_transfer=True # Considered a transfer conceptually, protects from gross income calculations
        )
        
        return Response(SavingsGoalSerializer(goal).data)

class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Debt.objects.filter(user=self.request.user).order_by('due_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        debt = self.get_object()
        amount = request.data.get('amount')
        account_id = request.data.get('account_id')
        
        if not amount or not account_id:
            return Response({'error': 'amount and account_id are required'}, status=400)
            
        try:
            amount = Decimal(str(amount))
            if amount <= Decimal('0.00'):
                return Response({'error': 'Amount must be positive'}, status=400)
        except (InvalidOperation, ValueError):
            return Response({'error': 'Invalid amount'}, status=400)
            
        if amount > debt.remaining_amount:
            return Response({'error': 'Amount exceeds remaining debt'}, status=400)
            
        account = Account.objects.filter(id=account_id, user=request.user).first()
        if not account:
            return Response({'error': 'Account not found'}, status=404)
            
        # Update debt
        new_remaining = debt.remaining_amount - amount
        debt.remaining_amount = new_remaining
        if new_remaining <= Decimal('0.00'):
            debt.is_settled = True
        debt.save()
        
        # Create transaction
        # If I owe money and I pay it, it's an expense (OUT) from my account
        # If someone owes me money and pays me, it's an income (IN) to my account
        tx_type = 'OUT' if debt.type == 'I_OWE' else 'IN'
        desc = f"Payment for debt/loan: {debt.name}"
        
        Transaction.objects.create(
            user=request.user,
            account=account,
            type=tx_type,
            amount=amount,
            date=datetime.date.today(),
            description=desc,
            payment_method='TRANSFER', # Defaulting to TRANSFER, or we could pass it from frontend
            category=None,
            spending_kind='NECESSARY' if tx_type == 'OUT' else None,
        )
        
        # We don't update account.balance directly if it's dynamically calculated in summary, 
        # but in the model account.balance might be a base balance. 
        # According to summary it uses `Account.balance + incomes - expenses`.
        
        return Response(DebtSerializer(debt).data)

class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def credit_buckets(self, request, pk=None):
        card = self.get_object()
        if card.type != 'CREDIT':
            return Response({'error': 'This account is not a credit card'}, status=400)

        return Response(self._credit_bucket_payload(card))

    @action(detail=True, methods=['post'])
    def pay_credit_statement(self, request, pk=None):
        card = self.get_object()
        if card.type != 'CREDIT':
            return Response({'error': 'This account is not a credit card'}, status=400)

        due_date = parse_date(request.data.get('due_date', '') or '')
        if not due_date:
            return Response({'error': 'due_date is required'}, status=400)

        source = self._payment_source_account(request)
        if isinstance(source, Response):
            return source

        bucket = self._find_credit_bucket(card, due_date)
        if not bucket or bucket['pending'] <= Decimal('0.00'):
            return Response({'error': 'No pending statement found for that due_date'}, status=400)

        amount = request.data.get('amount')
        if amount in (None, ''):
            amount = bucket['pending']
        else:
            parsed_amount = self._parse_positive_decimal(amount)
            if isinstance(parsed_amount, Response):
                return parsed_amount
            amount = parsed_amount

        if amount > bucket['pending']:
            return Response({'error': 'Amount exceeds pending statement balance'}, status=400)

        payment_date = parse_date(request.data.get('date', '') or '') or datetime.date.today()
        with db_transaction.atomic():
            self._create_credit_card_payment(
                source=source,
                card=card,
                amount=amount,
                payment_date=payment_date,
                statement_date=bucket['statement_date'],
                due_date=bucket['due_date'],
                label=f'Pago estado tarjeta {card.name}',
            )

        return Response(self._credit_bucket_payload(card))

    @action(detail=True, methods=['post'])
    def pay_credit_amount(self, request, pk=None):
        card = self.get_object()
        if card.type != 'CREDIT':
            return Response({'error': 'This account is not a credit card'}, status=400)

        source = self._payment_source_account(request)
        if isinstance(source, Response):
            return source

        amount = self._parse_positive_decimal(request.data.get('amount'))
        if isinstance(amount, Response):
            return amount

        debt = calculate_credit_card_debt(request.user, card)
        if amount > debt:
            return Response({'error': 'Amount exceeds current credit card debt'}, status=400)

        payment_date = parse_date(request.data.get('date', '') or '') or datetime.date.today()
        with db_transaction.atomic():
            Transaction.objects.create(
                user=request.user,
                type='OUT',
                account=source,
                amount=amount,
                date=payment_date,
                description=f'Abono libre a tarjeta {card.name}',
                payment_method='TRANSFER',
                is_transfer=True,
            )

            remaining = amount
            data = build_credit_card_buckets(request.user, card)
            for bucket in data['buckets']:
                if remaining <= Decimal('0.00'):
                    break
                if bucket['pending'] <= Decimal('0.00'):
                    continue

                allocated = min(remaining, bucket['pending'])
                Transaction.objects.create(
                    user=request.user,
                    type='IN',
                    account=card,
                    amount=allocated,
                    date=payment_date,
                    description=f'Abono libre a tarjeta {card.name}',
                    payment_method='TRANSFER',
                    is_transfer=True,
                    credit_statement_date=bucket['statement_date'],
                    credit_due_date=bucket['due_date'],
                )
                remaining -= allocated

            if remaining > Decimal('0.00'):
                Transaction.objects.create(
                    user=request.user,
                    type='IN',
                    account=card,
                    amount=remaining,
                    date=payment_date,
                    description=f'Abono libre a tarjeta {card.name}',
                    payment_method='TRANSFER',
                    is_transfer=True,
                )

        return Response(self._credit_bucket_payload(card))

    def _credit_bucket_payload(self, card):
        data = build_credit_card_buckets(self.request.user, card)
        buckets = [self._serialize_credit_bucket(bucket) for bucket in data['buckets']]
        pending_buckets = [bucket for bucket in data['buckets'] if bucket['pending'] > Decimal('0.00')]
        next_bucket = pending_buckets[0] if pending_buckets else None
        future_pending = Decimal('0.00')
        if next_bucket:
            future_pending = sum(
                (bucket['pending'] for bucket in pending_buckets if bucket['due_date'] > next_bucket['due_date']),
                Decimal('0.00'),
            )

        return {
            'card_id': card.id,
            'buckets': buckets,
            'next_bucket': self._serialize_credit_bucket(next_bucket) if next_bucket else None,
            'future_pending': future_pending,
            'unbucketed_total': data['unbucketed_total'],
            'unassigned_payment_remaining': data['unassigned_payment_remaining'],
        }

    def _serialize_credit_bucket(self, bucket):
        if not bucket:
            return None

        return {
            'statement_date': bucket['statement_date'].strftime('%Y-%m-%d') if bucket['statement_date'] else None,
            'due_date': bucket['due_date'].strftime('%Y-%m-%d'),
            'purchases_total': bucket['purchases_total'],
            'paid_total': bucket['paid_total'],
            'pending': bucket['pending'],
            'transactions': [
                {
                    **transaction,
                    'date': transaction['date'].strftime('%Y-%m-%d'),
                    'credit_statement_date': transaction['credit_statement_date'].strftime('%Y-%m-%d') if transaction['credit_statement_date'] else None,
                    'credit_due_date': transaction['credit_due_date'].strftime('%Y-%m-%d') if transaction['credit_due_date'] else None,
                }
                for transaction in bucket['transactions']
            ],
        }

    def _find_credit_bucket(self, card, due_date):
        data = build_credit_card_buckets(self.request.user, card)
        for bucket in data['buckets']:
            if bucket['due_date'] == due_date:
                return bucket
        return None

    def _payment_source_account(self, request):
        source_account_id = request.data.get('source_account_id') or request.data.get('account_id')
        if not source_account_id:
            return Response({'error': 'source_account_id is required'}, status=400)

        source = Account.objects.filter(id=source_account_id, user=request.user, is_active=True).first()
        if not source:
            return Response({'error': 'Source account not found'}, status=404)
        if source.type == 'CREDIT':
            return Response({'error': 'Source account cannot be another credit card'}, status=400)
        return source

    def _parse_positive_decimal(self, amount):
        if amount in (None, ''):
            return Response({'error': 'amount is required'}, status=400)

        try:
            amount = Decimal(str(amount))
        except (InvalidOperation, ValueError):
            return Response({'error': 'Invalid amount'}, status=400)

        if amount <= Decimal('0.00'):
            return Response({'error': 'Amount must be positive'}, status=400)
        return amount

    def _create_credit_card_payment(self, source, card, amount, payment_date, statement_date, due_date, label):
        Transaction.objects.create(
            user=self.request.user,
            type='OUT',
            account=source,
            amount=amount,
            date=payment_date,
            description=label,
            payment_method='TRANSFER',
            is_transfer=True,
        )
        Transaction.objects.create(
            user=self.request.user,
            type='IN',
            account=card,
            amount=amount,
            date=payment_date,
            description=label,
            payment_method='TRANSFER',
            is_transfer=True,
            credit_statement_date=statement_date,
            credit_due_date=due_date,
        )

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        account = self.get_object()
        actual_balance = request.data.get('actual_balance')
        notes = request.data.get('notes', '')

        if actual_balance is None:
            return Response({'error': 'actual_balance is required'}, status=400)

        try:
            actual_balance = Decimal(str(actual_balance))
        except (InvalidOperation, ValueError):
            return Response({'error': 'Invalid actual_balance'}, status=400)

        # Calculate current balance (same logic as summary)
        account_txs = Transaction.objects.filter(user=self.request.user, is_deleted=False, account=account)
        acc_incomes = account_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        acc_expenses = account_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        
        current_calculated_balance = account.balance + acc_incomes - acc_expenses
        diff = actual_balance - current_calculated_balance

        if diff == Decimal('0.00'):
            return Response({'message': 'Balance is already correct', 'balance': actual_balance})

        tx_type = 'IN' if diff > 0 else 'OUT'
        abs_diff = abs(diff)

        description = "Ajuste de saldo"
        if notes:
            description += f": {notes}"

        Transaction.objects.create(
            user=self.request.user,
            account=account,
            type=tx_type,
            amount=abs_diff,
            date=datetime.date.today(),
            description=description,
            payment_method='TRANSFER', # Using TRANSFER as it's an internal adjustment
            is_transfer=False
        )

        return Response({
            'message': 'Adjustment created successfully',
            'previous_balance': current_calculated_balance,
            'new_balance': actual_balance,
            'adjustment_amount': abs_diff,
            'type': tx_type
        })

class RecurringExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecurringExpense.objects.filter(user=self.request.user).order_by('due_day', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        expense = self.get_object()
        account_id = request.data.get('account_id') or (expense.account.id if expense.account else None)
        
        # Create the transaction
        Transaction.objects.create(
            user=self.request.user,
            type='OUT',
            account_id=account_id,
            category_id=expense.category.id if expense.category else None,
            amount=expense.amount,
            date=request.data.get('date') or datetime.date.today(),
            description=f'Pago automatizado: {expense.name}',
            payment_method='TRANSFER', # Default assume electronic
            spending_kind='NECESSARY',
        )
        
        # Update the expense
        expense.last_paid_date = request.data.get('date') or datetime.date.today()
        expense.save()
        
        return Response(RecurringExpenseSerializer(expense).data)

class RecurringIncomeViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringIncomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecurringIncome.objects.filter(user=self.request.user).order_by('due_day', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        income = self.get_object()
        account_id = request.data.get('account_id') or (income.account.id if income.account else None)

        Transaction.objects.create(
            user=self.request.user,
            type='IN',
            account_id=account_id,
            category_id=income.category.id if income.category else None,
            amount=income.amount,
            date=request.data.get('date') or datetime.date.today(),
            description=f'Ingreso fijo: {income.name}',
            payment_method='TRANSFER',
        )

        income.last_received_date = request.data.get('date') or datetime.date.today()
        income.save()

        return Response(RecurringIncomeSerializer(income).data)

class FinancialProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        profile, _ = FinancialProfile.objects.get_or_create(user=request.user)

        if request.method.lower() == 'patch':
            serializer = FinancialProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data)

        return Response(FinancialProfileSerializer(profile).data)
