from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('national_leader', 'National Leader'),
        ('zone_leader', 'Zone Leader'),
        ('regional_leader', 'Regional Leader'),
        ('district_leader', 'District Leader'),
        ('local_leader', 'Local Leader'),
        ('local_member', 'Local Member'),
        ('finance_team', 'Finance Team'),
    )
    
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='local_member')
    church = models.ForeignKey('churches.Church', on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    christian_birth_date = models.DateField(null=True, blank=True)
    spiritual_gifts = models.JSONField(default=list, blank=True)
    ministry_interests = models.JSONField(default=list, blank=True)
    guardian_name = models.CharField(max_length=255, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    guardian_relationship = models.CharField(max_length=50, blank=True)
    neighborhood = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} - {self.role}"

    class Meta:
        db_table = 'users'