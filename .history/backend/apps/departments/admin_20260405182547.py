from django.contrib import admin
from .models import Department, DepartmentMember

class DepartmentMemberInline(admin.TabularInline):
    model = DepartmentMember
    extra = 1
    raw_id_fields = ('member',)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'church', 'leader', 'is_active', 'created_at')
    list_filter = ('is_active', 'church')
    search_fields = ('name', 'description')
    raw_id_fields = ('leader', 'parent_department')
    inlines = [DepartmentMemberInline]
    # Remove 'members' from filter_horizontal since it has a custom through model
    filter_horizontal = []

@admin.register(DepartmentMember)
class DepartmentMemberAdmin(admin.ModelAdmin):
    list_display = ('department', 'member', 'role', 'joined_date', 'is_active')
    list_filter = ('role', 'is_active', 'department')
    search_fields = ('member__username', 'member__email')
    raw_id_fields = ('member', 'department')