from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'church', 'is_approved', 'is_active', 'is_superuser')
    list_filter = ('role', 'is_approved', 'is_active', 'is_superuser')
    search_fields = ('username', 'email', 'full_name', 'phone')
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'email', 'phone', 'profile_picture', 'date_of_birth', 'neighborhood')}),
        ('Church Information', {'fields': ('role', 'church', 'is_approved', 'approved_by', 'approved_at')}),
        ('Spiritual Information', {'fields': ('christian_birth_date', 'spiritual_gifts', 'ministry_interests')}),
        ('Guardian Information', {'fields': ('guardian_name', 'guardian_phone', 'guardian_relationship')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'full_name', 'password1', 'password2', 'role'),
        }),
    )
    
    ordering = ('username',)
    filter_horizontal = ('groups', 'user_permissions',)

admin.site.register(User, CustomUserAdmin)