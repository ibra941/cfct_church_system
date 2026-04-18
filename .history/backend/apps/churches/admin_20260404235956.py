from django.contrib import admin
from .models import Church

@admin.register(Church)
class ChurchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'church_type', 'parent_church')
    list_filter = ('church_type',)
    search_fields = ('name', 'code')
    raw_id_fields = ('parent_church',)
    ordering = ('church_type', 'name')