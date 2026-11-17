from rest_framework import serializers
from .models import Category, Transaction, SavingsGoal, Debt, Account, RecurringExpense, RecurringIncome, FinancialProfile


class OwnedRelationsSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context['request'].user
        for field in ('account', 'category'):
            value = attrs.get(field)
            if value and value.user_id != user.id:
                raise serializers.ValidationError({field: 'Este registro no pertenece a tu cuenta.'})
        return attrs

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ('user',)

class TransactionSerializer(OwnedRelationsSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('user',)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('El importe debe ser mayor que cero.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        category = attrs.get('category', getattr(self.instance, 'category', None))
        kind = attrs.get('type', getattr(self.instance, 'type', None))
        if category and category.type != kind:
            raise serializers.ValidationError({'category': 'La categoría debe corresponder al tipo de movimiento.'})
        return attrs

class SavingsGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsGoal
        fields = '__all__'
        read_only_fields = ('user',)

class DebtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debt
        fields = '__all__'
        read_only_fields = ('user',)

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'
        read_only_fields = ('user',)

class RecurringExpenseSerializer(OwnedRelationsSerializer):
    class Meta:
        model = RecurringExpense
        fields = '__all__'
        read_only_fields = ('user',)

class RecurringIncomeSerializer(OwnedRelationsSerializer):
    class Meta:
        model = RecurringIncome
        fields = '__all__'
        read_only_fields = ('user',)

class FinancialProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialProfile
        fields = '__all__'
        read_only_fields = ('user',)
