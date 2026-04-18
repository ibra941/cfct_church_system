from django.contrib import admin
from .models import Church

@admin.register(Church)
class ChurchAdmin(admin.ModelAdmin):
    list_display = ('name', 'church_code', 'church_type', 'parent_church', 'is_active')
    list_filter = ('church_type', 'is_active')
    search_fields = ('name', 'church_code')