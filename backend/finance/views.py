import datetime
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Category, Transaction, SavingsGoal, Debt
from .serializers import CategorySerializer, TransactionSerializer, SavingsGoalSerializer, DebtSerializer

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
        
        incomes = queryset.filter(type='IN').aggregate(Sum('amount'))['amount__sum'] or 0
        expenses = queryset.filter(type='OUT').aggregate(Sum('amount'))['amount__sum'] or 0
        
        expenses_by_category = queryset.filter(type='OUT').values('category__name', 'category__color').annotate(total=Sum('amount')).order_by('-total')
        
        return Response({
            'balance': incomes - expenses,
            'total_income': incomes,
            'total_expense': expenses,
            'expenses_by_category': list(expenses_by_category)
        })

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
        Transaction.objects.create(
            user=self.request.user,
            type='OUT',
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
