from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'church', 'is_approved', 'is_active')
    list_filter = ('role', 'is_approved', 'is_active')
    search_fields = ('username', 'email', 'phone')
    fieldsets = UserAdmin.fieldsets + (
        ('Church Information', {'fields': ('role', 'church', 'is_approved', 'approved_by', 'approved_at')}),
        ('Personal Information', {'fields': ('phone', 'profile_picture', 'date_of_birth', 'neighborhood')}),
        ('Spiritual Information', {'fields': ('christian_birth_date', 'spiritual_gifts', 'ministry_interests')}),
        ('Guardian Information', {'fields': ('guardian_name', 'guardian_phone', 'guardian_relationship')}),
    )

admin.site.register(User, CustomUserAdmin)