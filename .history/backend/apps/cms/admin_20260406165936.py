from django.contrib import admin
from django.utils.html import format_html
from .models import SiteSetting, HomePageContent, SocialMediaLink, ContactInfo, FooterLink

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'setting_type', 'value_preview', 'updated_at')
    list_filter = ('setting_type',)
    search_fields = ('key', 'value', 'description')
    fieldsets = (
        ('Setting Information', {
            'fields': ('key', 'value', 'setting_type', 'description')
        }),
        ('Metadata', {
            'fields': ('updated_by',),
            'classes': ('collapse',)
        }),
    )
    
    def value_preview(self, obj):
        if obj.setting_type == 'image':
            return format_html('<img src="{}" style="max-height: 50px;"/>', obj.value)
        return obj.value[:50] + '...' if len(obj.value) > 50 else obj.value
    value_preview.short_description = 'Value Preview'
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(HomePageContent)
class HomePageContentAdmin(admin.ModelAdmin):
    list_display = ('section', 'title', 'is_active', 'order', 'updated_at')
    list_filter = ('section', 'is_active')
    search_fields = ('title', 'content')
    list_editable = ('order', 'is_active')
    fieldsets = (
        ('Section Information', {
            'fields': ('section', 'title', 'subtitle', 'content', 'image')
        }),
        ('Display Settings', {
            'fields': ('order', 'is_active')
        }),
        ('Metadata', {
            'fields': ('updated_by',),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SocialMediaLink)
class SocialMediaLinkAdmin(admin.ModelAdmin):
    list_display = ('platform', 'url', 'order', 'is_active')
    list_filter = ('platform', 'is_active')
    search_fields = ('platform', 'url')
    list_editable = ('order', 'is_active')
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    list_display = ('contact_type', 'value', 'order', 'is_active')
    list_filter = ('contact_type', 'is_active')
    search_fields = ('contact_type', 'value')
    list_editable = ('order', 'is_active')
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(FooterLink)
class FooterLinkAdmin(admin.ModelAdmin):
    list_display = ('title', 'url', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title', 'url')
    list_editable = ('order', 'is_active')
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)