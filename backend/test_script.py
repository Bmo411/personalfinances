import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from finance.models import Transaction, Account

print("Accounts:")
for a in Account.objects.all():
    print(a.id, a.name, a.balance)

print("\nTransactions (last 10):")
for t in Transaction.objects.order_by('-id')[:10]:
    print(f"ID={t.id} Type={t.type} amount={t.amount} acc_id={t.account_id if t.account else 'None'} is_transfer={t.is_transfer} desc={t.description}")
