from django.conf import settings
from django.db import models


class AttendanceRecord(models.Model):
    SERVICE_TYPES = (
        ('sunday', 'Sunday Service'),
        ('midweek', 'Midweek Service'),
        ('prayer', 'Prayer Meeting'),
        ('conference', 'Conference'),
        ('special', 'Special Service'),
        ('other', 'Other'),
    )

    church = models.ForeignKey(
        'churches.Church',
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    service_date = models.DateField()
    service_type = models.CharField(max_length=32, choices=SERVICE_TYPES, default='sunday')
    attendance_count = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_attendance',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance_records'
        ordering = ['-service_date', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['church', 'service_date', 'service_type'],
                name='unique_attendance_per_service',
            ),
        ]

    def __str__(self):
        return f'{self.church.name} - {self.service_date} ({self.service_type})'


class AttendanceCheckIn(models.Model):
    """A single member check-in captured from a QR attendance session."""

    church = models.ForeignKey(
        'churches.Church',
        on_delete=models.CASCADE,
        related_name='member_checkins',
    )
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_checkins',
    )
    service_date = models.DateField()
    service_type = models.CharField(max_length=32, choices=AttendanceRecord.SERVICE_TYPES, default='sunday')
    service_title = models.CharField(max_length=255, blank=True)
    checkin_token = models.CharField(max_length=512, blank=True)
    checked_in_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance_checkins'
        ordering = ['-service_date', '-checked_in_at']
        constraints = [
            models.UniqueConstraint(
                fields=['church', 'member', 'service_date', 'service_type', 'service_title'],
                name='unique_member_checkin_per_service',
            ),
        ]

    def __str__(self):
        return f'{self.member.username} @ {self.church.name} on {self.service_date}'
