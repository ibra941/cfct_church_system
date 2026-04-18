from django.contrib import admin
from .models import LeadershipHistory

@admin.register(LeadershipHistory)
class LeadershipHistoryAdmin(admin.ModelAdmin):
    list_display = ('leader', 'position', 'church', 'start_date', 'end_date', 'is_current')
    list_filter = ('is_current', 'church')
    search_fields = ('leader__username', 'position')
    date_hierarchy = 'start_date'