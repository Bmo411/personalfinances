import calendar
import datetime

from django.db import migrations, models


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


def backfill_credit_dates(apps, schema_editor):
    Transaction = apps.get_model('finance', 'Transaction')

    purchases = (
        Transaction.objects
        .filter(type='OUT', is_deleted=False, account__type='CREDIT')
        .select_related('account')
    )

    for purchase in purchases.iterator():
        account = purchase.account
        statement_date, due_date = credit_statement_and_due_dates(
            purchase.date,
            account.statement_cut_day,
            account.payment_due_day,
        )
        if not statement_date or not due_date:
            continue

        purchase.credit_statement_date = statement_date
        purchase.credit_due_date = due_date
        purchase.save(update_fields=['credit_statement_date', 'credit_due_date'])


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0010_recurringincome'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='credit_due_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='transaction',
            name='credit_statement_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['user', 'credit_due_date'], name='finance_tra_user_id_168f51_idx'),
        ),
        migrations.RunPython(backfill_credit_dates, migrations.RunPython.noop),
    ]
