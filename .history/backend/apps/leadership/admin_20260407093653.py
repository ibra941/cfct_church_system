from django.contrib import admin
from .models import LeadershipHistory

@admin.register(LeadershipHistory)
class LeadershipHistoryAdmin(admin.ModelAdmin):
    list_display = ('leader', 'position', 'church', 'start_date', 'end_date', 'is_current')
    list_filter = ('is_current', 'church')
    search_fields = ('leader__username', 'leader__full_name', 'position')
    date_hierarchy = 'start_date'
    raw_id_fields = ('leader', 'church', 'created_by')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Leadership Information', {
            'fields': ('church', 'leader', 'position')
        }),
        ('Date Information', {
            'fields': ('start_date', 'end_date', 'is_current')
        }),
        ('Additional Information', {
            'fields': ('appointment_letter', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )