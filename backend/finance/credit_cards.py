import calendar
import datetime
from decimal import Decimal

from django.db.models import Sum

from .models import Transaction


def date_for_day(year, month, day):
    year += (month - 1) // 12
    month = ((month - 1) % 12) + 1
    last_day = calendar.monthrange(year, month)[1]
    return datetime.date(year, month, min(day, last_day))


def credit_statement_and_due_dates(purchase_date, statement_cut_day, payment_due_day):
    if not purchase_date or not statement_cut_day or not payment_due_day:
        return None, None

    current_statement = date_for_day(purchase_date.year, purchase_date.month, statement_cut_day)
    if purchase_date <= current_statement:
        statement_date = current_statement
    else:
        statement_date = date_for_day(purchase_date.year, purchase_date.month + 1, statement_cut_day)

    due_month_offset = 1 if payment_due_day <= statement_cut_day else 0
    due_date = date_for_day(statement_date.year, statement_date.month + due_month_offset, payment_due_day)
    return statement_date, due_date


def credit_card_debt(user, card):
    card_txs = Transaction.objects.filter(user=user, is_deleted=False, account=card)
    incomes = card_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    expenses = card_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    calculated_balance = card.balance + incomes - expenses
    return max(Decimal('0.00'), -calculated_balance)


def set_credit_dates_for_transaction(transaction, account=None, force=False):
    account = account or transaction.account
    if not account or account.type != 'CREDIT' or transaction.type != 'OUT':
        return transaction

    statement_date, due_date = credit_statement_and_due_dates(
        transaction.date,
        account.statement_cut_day,
        account.payment_due_day,
    )
    if not statement_date or not due_date:
        return transaction

    if force or not transaction.credit_statement_date:
        transaction.credit_statement_date = statement_date
    if force or not transaction.credit_due_date:
        transaction.credit_due_date = due_date
    return transaction


def build_credit_card_buckets(user, card):
    buckets = {}
    unbucketed_total = Decimal('0.00')

    purchases = (
        Transaction.objects
        .filter(user=user, account=card, is_deleted=False, type='OUT', is_transfer=False)
        .order_by('date', 'id')
    )
    for purchase in purchases:
        statement_date = purchase.credit_statement_date
        due_date = purchase.credit_due_date
        if not statement_date or not due_date:
            statement_date, due_date = credit_statement_and_due_dates(
                purchase.date,
                card.statement_cut_day,
                card.payment_due_day,
            )

        if not statement_date or not due_date:
            unbucketed_total += purchase.amount
            continue

        bucket = buckets.setdefault(
            due_date,
            {
                'statement_date': statement_date,
                'due_date': due_date,
                'purchases_total': Decimal('0.00'),
                'paid_total': Decimal('0.00'),
                'pending': Decimal('0.00'),
                'transactions': [],
            },
        )
        bucket['purchases_total'] += purchase.amount
        bucket['transactions'].append({
            'id': purchase.id,
            'date': purchase.date,
            'description': purchase.description,
            'amount': purchase.amount,
            'credit_statement_date': statement_date,
            'credit_due_date': due_date,
            'category_name': purchase.category.name if purchase.category else None,
        })

    unassigned_payments = Decimal('0.00')
    payments = (
        Transaction.objects
        .filter(user=user, account=card, is_deleted=False, type='IN')
        .order_by('date', 'id')
    )
    for payment in payments:
        if payment.credit_due_date:
            bucket = buckets.setdefault(
                payment.credit_due_date,
                {
                    'statement_date': payment.credit_statement_date,
                    'due_date': payment.credit_due_date,
                    'purchases_total': Decimal('0.00'),
                    'paid_total': Decimal('0.00'),
                    'pending': Decimal('0.00'),
                    'transactions': [],
                },
            )
            if not bucket['statement_date'] and payment.credit_statement_date:
                bucket['statement_date'] = payment.credit_statement_date
            bucket['paid_total'] += payment.amount
        else:
            unassigned_payments += payment.amount

    sorted_buckets = sorted(buckets.values(), key=lambda item: item['due_date'])

    remaining_unassigned = unassigned_payments
    for bucket in sorted_buckets:
        if remaining_unassigned <= Decimal('0.00'):
            break
        pending_before_unassigned = bucket['purchases_total'] - bucket['paid_total']
        if pending_before_unassigned <= Decimal('0.00'):
            continue
        allocated = min(remaining_unassigned, pending_before_unassigned)
        bucket['paid_total'] += allocated
        remaining_unassigned -= allocated

    for bucket in sorted_buckets:
        bucket['pending'] = max(Decimal('0.00'), bucket['purchases_total'] - bucket['paid_total'])

    return {
        'buckets': sorted_buckets,
        'unbucketed_total': unbucketed_total,
        'unassigned_payment_remaining': remaining_unassigned,
    }


def next_pending_credit_bucket(user, card, today=None):
    today = today or datetime.date.today()
    data = build_credit_card_buckets(user, card)
    pending = [bucket for bucket in data['buckets'] if bucket['pending'] > Decimal('0.00')]
    if not pending:
        return None

    overdue = [bucket for bucket in pending if bucket['due_date'] < today]
    if overdue:
        return overdue[0]

    future = [bucket for bucket in pending if bucket['due_date'] >= today]
    return future[0] if future else pending[0]
