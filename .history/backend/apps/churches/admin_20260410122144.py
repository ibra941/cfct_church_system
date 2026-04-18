from django.contrib import admin
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import path
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import Church
from apps.accounts.models import User


class ChurchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'church_type', 'parent_church', 'is_active', 'city', 'phone', 'admin_actions')
    list_filter = ('church_type', 'is_active', 'country', 'region')
    search_fields = ('name', 'code', 'city', 'region', 'phone', 'email')
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

    def actions(self, obj):
        return format_html(
            '<a class="button" href="{}">Transfer</a>',
            f'/admin/churches/church/{obj.id}/transfer/'
        )
    actions.short_description = 'Actions'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:church_id>/transfer/', self.admin_site.admin_view(self.transfer_church), name='church_transfer'),
        ]
        return custom_urls + urls

    def transfer_church(self, request, church_id):
        church = self.get_object(request, church_id)
        if request.method == 'POST':
            new_parent_id = request.POST.get('new_parent')
            if new_parent_id:
                try:
                    new_parent = Church.objects.get(id=new_parent_id)
                    church.parent_church = new_parent
                    church.save()
                    messages.success(request, f'Church "{church.name}" has been transferred successfully.')
                    return redirect('admin:churches_church_changelist')
                except Church.DoesNotExist:
                    messages.error(request, 'Invalid parent church selected.')
            else:
                messages.error(request, 'Please select a new parent church.')

        # Get available parent churches based on church type
        if church.church_type == 'zone':
            available_parents = Church.objects.filter(church_type='national')
        elif church.church_type == 'region':
            available_parents = Church.objects.filter(church_type='zone')
        elif church.church_type == 'district':
            available_parents = Church.objects.filter(church_type='region')
        elif church.church_type == 'local':
            available_parents = Church.objects.filter(church_type='district')
        else:
            available_parents = Church.objects.none()

        context = {
            'church': church,
            'available_parents': available_parents,
            'title': f'Transfer Church: {church.name}'
        }
        return self.render_transfer_form(request, context)

    def render_transfer_form(self, request, context):
        return self.admin_site.admin_view(lambda r: None)(request)  # Placeholder for template rendering

    def delete_queryset(self, request, queryset):
        """Override to handle church deletion with proper cleanup"""
        for church in queryset:
            # Update users to remove church association
            User.objects.filter(church=church).update(church=None)
            # Delete child churches
            church.delete()
        messages.success(request, f'Successfully deleted {queryset.count()} church(es).')