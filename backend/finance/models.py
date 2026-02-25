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
