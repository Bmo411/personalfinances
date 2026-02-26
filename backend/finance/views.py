import datetime
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q 
from django.db.models import Sum, Q 
from .models import Category, Transaction, SavingsGoal, Debt, Account, RecurringExpense
from .serializers import CategorySerializer, TransactionSerializer, SavingsGoalSerializer, DebtSerializer, AccountSerializer, RecurringExpenseSerializer

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
        if month and year:
            queryset = queryset.filter(date__year=year, date__month=month)
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        
        # Omit transfers from net income/expense calculations
        incomes = queryset.filter(type='IN', is_transfer=False).aggregate(Sum('amount'))['amount__sum'] or 0
        expenses = queryset.filter(type='OUT', is_transfer=False).aggregate(Sum('amount'))['amount__sum'] or 0
        
        expenses_by_category = queryset.filter(type='OUT', is_transfer=False).values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')
        
        # Calculate exactly how much money we have physically or in the bank by matching Accounts against Transactions
        accounts = Account.objects.filter(user=self.request.user)
        accounts_data = []
        for account in accounts:
            # We must sum all incomes towards this account and subtract all expenses from it
            # Initial balance + (Incomes) - (Expenses)
            # IMPORTANT: For account balances, we MUST include transfers, so we query the DB directly, not the filtered queryset!
            # AND we MUST NOT filter by date, because an account balance is the sum of ALL history.
            account_txs = Transaction.objects.filter(user=self.request.user, is_deleted=False, account=account)
            
            acc_incomes = account_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or 0
            acc_expenses = account_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or 0
            
            calculated_balance = account.balance + acc_incomes - acc_expenses
            accounts_data.append({
                'id': account.id,
                'name': account.name,
                'type': account.type,
                'color': account.color,
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
            
        return Response({
            'balance': incomes - expenses,
            'total_income': incomes,
            'total_expense': expenses,
            'expenses_by_category': list(expenses_by_category),
            'accounts': accounts_data,
            'upcoming_fixed_expenses': upcoming_fixed_expenses
        })

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
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=400)
        except ValueError:
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
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=400)
        except ValueError:
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
        )
        
        return Response(SavingsGoalSerializer(goal).data)

class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Debt.objects.filter(user=self.request.user).order_by('due_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user).order_by('name')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        )
        
        # Update the expense
        expense.last_paid_date = request.data.get('date') or datetime.date.today()
        expense.save()
        
        return Response(RecurringExpenseSerializer(expense).data)
