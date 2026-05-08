from django.db import models
from apps.churches.models import Church
from apps.accounts.models import User

class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='departments')
    leader = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='led_departments')
    parent_department = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_departments')
    members = models.ManyToManyField(User, through='DepartmentMember', related_name='departments')
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    meeting_day = models.CharField(max_length=20, blank=True)
    meeting_time = models.TimeField(null=True, blank=True)
    meeting_venue = models.CharField(max_length=255, blank=True)
    objectives = models.TextField(blank=True)
    activities_summary = models.TextField(blank=True)
    policies = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'departments'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class DepartmentMember(models.Model):
    ROLE_CHOICES = (
        ('leader', 'Leader'),
        ('deputy', 'Deputy Leader'),
        ('secretary', 'Secretary'),
        ('treasurer', 'Treasurer'),
        ('member', 'Member'),
    )
    
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='department_members')
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='member_departments')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='member')
    joined_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'department_members'
        unique_together = ('department', 'member')
    
    def __str__(self):
        return f"{self.member.username} - {self.department.name} ({self.role})"


class DepartmentJoinRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='join_requests')
    member = models.ForeignKey(User, on_delete=models.CASCADE, related_name='department_join_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_department_requests')
    review_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'department_join_requests'
        ordering = ['-requested_at']
        constraints = [
            models.UniqueConstraint(fields=['department', 'member'], name='unique_department_join_request'),
        ]

    def __str__(self):
        return f"{self.member.username} -> {self.department.name} ({self.status})"