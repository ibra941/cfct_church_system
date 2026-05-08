from django.contrib import admin

from .models import AttendanceCheckIn, AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('church', 'service_date', 'service_type', 'attendance_count', 'recorded_by')
    list_filter = ('service_type', 'service_date', 'church')
    search_fields = ('church__name', 'notes', 'recorded_by__username', 'recorded_by__full_name')
    date_hierarchy = 'service_date'


@admin.register(AttendanceCheckIn)
class AttendanceCheckInAdmin(admin.ModelAdmin):
    list_display = ('member', 'church', 'service_date', 'service_type', 'service_title', 'checked_in_at')
    list_filter = ('service_type', 'service_date', 'church')
    search_fields = (
        'member__username',
        'member__full_name',
        'member__email',
        'church__name',
        'service_title',
    )
    date_hierarchy = 'service_date'
