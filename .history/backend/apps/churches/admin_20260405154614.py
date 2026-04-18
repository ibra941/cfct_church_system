from django.contrib import admin
from .models import Church

@admin.register(Church)
class ChurchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'church_type', 'parent_church', 'is_active')
    list_filter = ('church_type', 'is_active', 'country')
    search_fields = ('name', 'code', 'city', 'region')
    raw_id_fields = ('parent_church',)
    prepopulated_fields = {'code': ('name',)}
    ordering = ('church_type', 'name')
    
    fieldsets = (
        (None, {'fields': ('name', 'code', 'church_type', 'parent_church')}),
        ('Location', {'fields': ('address', 'city', 'region', 'country')}),
        ('Contact', {'fields': ('phone', 'email')}),
        ('Media', {'fields': ('logo',)}),
        ('Status', {'fields': ('is_active', 'established_date')}),
    )