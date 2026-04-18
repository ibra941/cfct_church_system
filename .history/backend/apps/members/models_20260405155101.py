from django.db import models
from apps.accounts.models import User
from apps.churches.models import Church

class MemberRegistration(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='registration')
    church = models.ForeignKey(Church, on_delete=models.CASCADE)
    personal_info = models.JSONField()
    guardian_info = models.JSONField()
    spiritual_info = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_registrations')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'member_registrations'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Registration for {self.user.username} - {self.status}"