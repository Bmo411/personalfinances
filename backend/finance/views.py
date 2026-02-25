from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Category, Transaction
from .serializers import CategorySerializer, TransactionSerializer

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
