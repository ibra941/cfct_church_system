from django.db import models
from apps.churches.models import Church
from apps.accounts.models import User

class Report(models.Model):
    REPORT_TYPES = (
        ('membership', 'Membership Report'),
        ('financial', 'Financial Report'),
        ('attendance', 'Attendance Report'),
        ('offerings', 'Offerings Report'),
        ('events', 'Events Report'),
    )
    
    FORMAT_CHOICES = (
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
    )
    
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='reports')
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    parameters = models.JSONField(default=dict)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.created_at}"