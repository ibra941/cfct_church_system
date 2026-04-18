from django.contrib import admin
from .models import Transfer

@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ('member', 'from_church', 'to_church', 'status', 'transfer_date')
    list_filter = ('status', 'transfer_date')
    search_fields = ('member__username', 'from_church__name', 'to_church__name')