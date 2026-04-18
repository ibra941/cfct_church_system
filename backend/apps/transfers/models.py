from django.db import models
from apps.accounts.models import User
from apps.churches.models import Church

class Transfer(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    )
    
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transfers')
    from_church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='transfers_from')
    to_church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='transfers_to')
    transfer_reason = models.TextField()
    transfer_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by_from = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_from_transfers')
    approved_by_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_to_transfers')
    approval_date = models.DateTimeField(null=True, blank=True)
    recommendation_letter = models.FileField(upload_to='transfer_letters/', null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transfers'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Transfer of {self.member.username} from {self.from_church.name} to {self.to_church.name}"