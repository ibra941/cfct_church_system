"""
Signals for the attendance app.

When a member checks in via QR code, automatically update (or create) the
corresponding ``AttendanceRecord`` bulk-count for that church / date / service
so that leaders do not have to manually enter attendance totals.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Count

from .models import AttendanceCheckIn, AttendanceRecord


def _sync_attendance_record(church_id: int, service_date, service_type: str) -> None:
    """Recount check-ins and upsert the matching AttendanceRecord."""
    count = AttendanceCheckIn.objects.filter(
        church_id=church_id,
        service_date=service_date,
        service_type=service_type,
    ).count()

    if count == 0:
        # No check-ins remain — leave any manually-entered record untouched
        # but do not create a zero-count auto record.
        AttendanceRecord.objects.filter(
            church_id=church_id,
            service_date=service_date,
            service_type=service_type,
            notes__startswith='[auto]',
        ).delete()
        return

    record, created = AttendanceRecord.objects.get_or_create(
        church_id=church_id,
        service_date=service_date,
        service_type=service_type,
        defaults={
            'attendance_count': count,
            'notes': '[auto] Aggregated from QR check-ins.',
        },
    )

    if not created:
        # Only auto-update records that were themselves auto-created.
        # If a leader entered the count manually (notes doesn't start with
        # '[auto]'), keep their value and do not overwrite it.
        if record.notes.startswith('[auto]'):
            record.attendance_count = count
            record.save(update_fields=['attendance_count', 'updated_at'])


@receiver(post_save, sender=AttendanceCheckIn)
def checkin_saved(sender, instance, created, **kwargs):
    if created:
        _sync_attendance_record(
            church_id=instance.church_id,
            service_date=instance.service_date,
            service_type=instance.service_type,
        )


@receiver(post_delete, sender=AttendanceCheckIn)
def checkin_deleted(sender, instance, **kwargs):
    _sync_attendance_record(
        church_id=instance.church_id,
        service_date=instance.service_date,
        service_type=instance.service_type,
    )
