from django.db import models
from apps.churches.models import Church
from apps.accounts.models import User

class Event(models.Model):
    EVENT_TYPES = (
        ('service', 'Service'),
        ('conference', 'Conference'),
        ('seminar', 'Seminar'),
        ('prayer_meeting', 'Prayer Meeting'),
        ('youth', 'Youth Event'),
        ('children', 'Children Event'),
        ('outreach', 'Outreach'),
        ('other', 'Other'),
    )
    
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=255)
    description = models.TextField()
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, default='service')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    venue = models.CharField(max_length=255, blank=True)
    venue_address = models.TextField(blank=True)
    capacity = models.IntegerField(null=True, blank=True)
    registration_required = models.BooleanField(default=False)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    images = models.JSONField(default=list, blank=True)
    video_url = models.URLField(blank=True)
    organizer_name = models.CharField(max_length=255, blank=True)
    organizer_contact = models.CharField(max_length=100, blank=True)
    is_popup_news = models.BooleanField(default=False)
    popup_start_date = models.DateTimeField(null=True, blank=True)
    popup_end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        ordering = ['-start_date']
    
    def __str__(self):
        return self.title