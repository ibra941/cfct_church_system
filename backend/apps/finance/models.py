from django.db import models
from apps.churches.models import Church
from apps.accounts.models import User
from apps.departments.models import Department

class FinancialTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('transfer', 'Transfer'),
    )
    
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='transactions')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField()
    transaction_date = models.DateField()
    receipt_url = models.URLField(blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_transactions')
    approved_at = models.DateTimeField(null=True, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_transactions')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'financial_transactions'
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.transaction_date}"