from django.contrib import admin
from .models import Account, Category, Debt, FinancialProfile, RecurringExpense, SavingsGoal, Transaction

admin.site.register(Account)
admin.site.register(Category)
admin.site.register(Debt)
admin.site.register(FinancialProfile)
admin.site.register(RecurringExpense)
admin.site.register(SavingsGoal)
admin.site.register(Transaction)
