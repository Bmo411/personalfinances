from django.db import models
from django.conf import settings

class Category(models.Model):
    TYPE_CHOICES = (('IN', 'Ingreso'), ('OUT', 'Egreso'))
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    color = models.CharField(max_length=7, default='#000000') # Hex
    icon = models.CharField(max_length=50, blank=True, null=True) 
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.type})"

class Transaction(models.Model):
    TYPE_CHOICES = (('IN', 'Ingreso'), ('OUT', 'Egreso'))
    METHOD_CHOICES = (
        ('CASH', 'Efectivo'), 
        ('CARD', 'Tarjeta'), 
        ('TRANSFER', 'Transferencia')
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2) 
    date = models.DateField() 
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    payment_method = models.CharField(max_length=10, choices=METHOD_CHOICES)
    
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'type']),
        ]
        
    def __str__(self):
        return f"{self.amount} - {self.category.name if self.category else 'No Category'}"

class SavingsGoal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='savings_goals')
    name = models.CharField(max_length=150)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    target_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=7, default='#97A97C')
    is_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Saving: {self.name} - {self.current_amount}/{self.target_amount}"

class Debt(models.Model):
    TYPE_CHOICES = (
        ('OWED_TO_ME', 'Me deben (Por cobrar)'), 
        ('I_OWE', 'Debo (Por pagar)')
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='debts')
    name = models.CharField(max_length=150) # Name of person/entity
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    due_date = models.DateField(null=True, blank=True)
    is_settled = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Debt {self.type}: {self.name} - {self.remaining_amount}"
