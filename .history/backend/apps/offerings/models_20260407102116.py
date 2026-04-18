from django.db import models
from apps.churches.models import Church
from apps.accounts.models import User

class Offering(models.Model):
    OFFERING_TYPES = (
        ('tithe', 'Tithe'),
        ('offering', 'Offering'),
        ('pledge', 'Pledge'),
        ('building', 'Building Fund'),
        ('mission', 'Mission Fund'),
        ('benevolence', 'Benevolence'),
        ('thanksgiving', 'Thanksgiving'),
        ('other', 'Other'),
    )
    
    PAYMENT_METHODS = (
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('mobile_money', 'Mobile Money'),
        ('cheque', 'Cheque'),
        ('online', 'Online'),
    )
    
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='offerings')
    member = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='offerings')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    offering_type = models.CharField(max_length=50, choices=OFFERING_TYPES)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHODS)
    transaction_reference = models.CharField(max_length=100, unique=True, blank=True)
    receipt_no = models.CharField(max_length=100, unique=True, blank=True)  # Note: receipt_no, not receipt_number
    payment_date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_offerings')
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='verified_offerings')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'offerings'
        ordering = ['-payment_date']
    
    def __str__(self):
        return f"{self.offering_type} - {self.amount} - {self.payment_date}"
    
    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import random
            self.receipt_number = f"RCP-{self.church.id}-{random.randint(10000, 99999)}"
        super().save(*args, **kwargs)