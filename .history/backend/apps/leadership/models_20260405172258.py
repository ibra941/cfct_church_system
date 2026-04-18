from django.db import models
from apps.churches.models import Church
from apps.accounts.models import User

class LeadershipHistory(models.Model):
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='leadership_history')
    leader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leadership_positions')
    position = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)
    appointment_letter = models.FileField(upload_to='appointment_letters/', null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_leadership_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'leadership_history'
        ordering = ['-start_date']
        verbose_name_plural = 'Leadership Histories'
    
    def __str__(self):
        return f"{self.leader.username} - {self.position} at {self.church.name}"