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
        incomes_by_category = queryset.filter(type='IN', is_transfer=False).values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')
        
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
            
        # Last 7 days expenses
        last_7_days_expenses = []
        for i in range(6, -1, -1):
            day = today - datetime.timedelta(days=i)
            
            day_txs = Transaction.objects.filter(
                user=self.request.user, 
                is_deleted=False, 
                type='OUT', 
                is_transfer=False,
                date=day
            )
            
            day_total = day_txs.aggregate(Sum('amount'))['amount__sum'] or 0
            
            # Fetch breakdown by category
            day_categories = day_txs.values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')
            
            last_7_days_expenses.append({
                'date': day.strftime('%Y-%m-%d'),
                'total': day_total,
                'categories': list(day_categories)
            })
            
        return Response({
            'balance': incomes - expenses,
            'total_income': incomes,
            'total_expense': expenses,
            'expenses_by_category': list(expenses_by_category),
            'incomes_by_category': list(incomes_by_category),
            'accounts': accounts_data,
            'upcoming_fixed_expenses': upcoming_fixed_expenses,
            'last_7_days_expenses': last_7_days_expenses
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
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=400)
        except ValueError:
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
            amount = float(amount)
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=400)
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=400)
            
        if amount > float(debt.remaining_amount):
            return Response({'error': 'Amount exceeds remaining debt'}, status=400)
            
        account = Account.objects.filter(id=account_id, user=request.user).first()
        if not account:
            return Response({'error': 'Account not found'}, status=404)
            
        # Update debt
        new_remaining = float(debt.remaining_amount) - amount
        debt.remaining_amount = new_remaining
        if new_remaining <= 0:
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
            category=None
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

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        account = self.get_object()
        actual_balance = request.data.get('actual_balance')
        notes = request.data.get('notes', '')

        if actual_balance is None:
            return Response({'error': 'actual_balance is required'}, status=400)

        try:
            actual_balance = float(actual_balance)
        except ValueError:
            return Response({'error': 'Invalid actual_balance'}, status=400)

        # Calculate current balance (same logic as summary)
        account_txs = Transaction.objects.filter(user=self.request.user, is_deleted=False, account=account)
        acc_incomes = account_txs.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or 0
        acc_expenses = account_txs.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or 0
        
        current_calculated_balance = float(account.balance) + float(acc_incomes) - float(acc_expenses)
        diff = actual_balance - current_calculated_balance

        if diff == 0:
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
            is_transfer=True # Mark as transfer to avoid inflating gross income/expenses
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
        )
        
        # Update the expense
        expense.last_paid_date = request.data.get('date') or datetime.date.today()
        expense.save()
        
        return Response(RecurringExpenseSerializer(expense).data)
