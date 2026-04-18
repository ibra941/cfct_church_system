from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'church', 'is_approved', 'is_active', 'is_superuser')
    list_filter = ('role', 'is_approved', 'is_active', 'is_superuser', 'church')
    search_fields = ('username', 'email', 'full_name', 'phone')
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('full_name', 'email', 'phone', 'profile_picture', 'date_of_birth', 'neighborhood')}),
        (_('Church Information'), {'fields': ('role', 'church', 'is_approved', 'approved_by', 'approved_at')}),
        (_('Spiritual Information'), {'fields': ('christian_birth_date', 'spiritual_gifts', 'ministry_interests')}),
        (_('Guardian Information'), {'fields': ('guardian_name', 'guardian_phone', 'guardian_relationship')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'full_name', 'password1', 'password2', 'role', 'church'),
        }),
    )
    
    ordering = ('username',)
    filter_horizontal = ('groups', 'user_permissions',)