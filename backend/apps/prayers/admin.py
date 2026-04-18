from django.contrib import admin
from .models import PrayerRequest

@admin.register(PrayerRequest)
class PrayerRequestAdmin(admin.ModelAdmin):
    list_display = ('member', 'request_preview', 'status', 'is_public', 'created_at')
    list_filter = ('status', 'is_public')
    search_fields = ('member__username', 'request')
    
    def request_preview(self, obj):
        return obj.request[:50] + '...' if len(obj.request) > 50 else obj.request
    request_preview.short_description = 'Request'