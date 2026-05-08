from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Event


def _normalize_admin_datetime(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localtime(value)

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'church', 'event_type', 'start_date', 'popup_status', 'is_popup_news', 'is_active')
    list_filter = ('event_type', 'is_popup_news', 'is_active', 'church')
    search_fields = ('title', 'description', 'venue')
    date_hierarchy = 'start_date'
    readonly_fields = ('created_at', 'updated_at', 'popup_status_display')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'event_type', 'church')
        }),
        ('Date & Time', {
            'fields': ('start_date', 'end_date')
        }),
        ('Location', {
            'fields': ('venue', 'venue_address', 'capacity')
        }),
        ('Registration', {
            'fields': ('registration_required', 'registration_deadline', 'fee')
        }),
        ('Media', {
            'fields': ('images', 'video_url')
        }),
        ('Organizer', {
            'fields': ('organizer_name', 'organizer_contact')
        }),
        ('Popup News Settings', {
            'fields': ('is_popup_news', 'popup_start_date', 'popup_end_date'),
            'classes': ('collapse',),
            'description': 'Enable this to show event as popup news on homepage'
        }),
        ('Status', {
            'fields': ('is_active', 'created_by', 'created_at', 'updated_at')
        }),
    )
    
    def popup_status(self, obj):
        """Display popup status with color coding"""
        if not obj.is_popup_news:
            return format_html('<span style="color: gray;">●</span> Disabled')
        
        now = timezone.now()
        popup_start_date = _normalize_admin_datetime(obj.popup_start_date)
        popup_end_date = _normalize_admin_datetime(obj.popup_end_date)
        if popup_start_date and popup_end_date:
            if popup_start_date <= now <= popup_end_date:
                return format_html('<span style="color: green;">●</span> Active')
            elif now < popup_start_date:
                return format_html('<span style="color: orange;">●</span> Scheduled')
            else:
                return format_html('<span style="color: red;">●</span> Expired')
        return format_html('<span style="color: blue;">●</span> No dates set')
    popup_status.short_description = 'Popup Status'
    
    def popup_status_display(self, obj):
        """Detailed popup status for readonly field"""
        if not obj.is_popup_news:
            return "Popup news is disabled for this event"
        
        popup_start_date = _normalize_admin_datetime(obj.popup_start_date)
        popup_end_date = _normalize_admin_datetime(obj.popup_end_date)
        if popup_start_date and popup_end_date:
            return f"Active from {popup_start_date} to {popup_end_date}"
        return "Popup enabled but no date range set"
    popup_status_display.short_description = 'Popup Details'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('church')
    
    actions = ['make_popup_active', 'make_popup_inactive']
    
    def make_popup_active(self, request, queryset):
        """Bulk action to enable popup news for selected events"""
        updated = queryset.update(is_popup_news=True)
        self.message_user(request, f'{updated} event(s) marked as popup news.')
    make_popup_active.short_description = 'Enable popup news for selected events'
    
    def make_popup_inactive(self, request, queryset):
        """Bulk action to disable popup news for selected events"""
        updated = queryset.update(is_popup_news=False)
        self.message_user(request, f'{updated} event(s) removed from popup news.')
    make_popup_inactive.short_description = 'Disable popup news for selected events'