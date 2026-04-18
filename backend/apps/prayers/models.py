from django.db import models
from apps.accounts.models import User

class PrayerRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('prayed', 'Prayed'),
        ('answered', 'Answered'),
        ('closed', 'Closed'),
    )
    
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prayer_requests')
    request = models.TextField()
    is_public = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    answer_notes = models.TextField(blank=True)
    prayer_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'prayer_requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Prayer from {self.member.username}"