from django.contrib import admin
from .models import Event

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'church', 'event_type', 'start_date', 'is_popup_news')
    list_filter = ('event_type', 'is_popup_news', 'is_active')
    search_fields = ('title', 'description')
    date_hierarchy = 'start_date'