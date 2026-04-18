from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect
from .models import MemberRegistration
from apps.accounts.models import User


@admin.register(MemberRegistration)
class MemberRegistrationAdmin(admin.ModelAdmin):
    list_display = ('user', 'church', 'status', 'created_at', 'personal_info_display', 'guardian_info_display', 'spiritual_info_display', 'actions')
    list_filter = ('status', 'created_at', 'church')
    search_fields = ('user__username', 'user__email', 'user__full_name', 'church__name')
    readonly_fields = ('created_at', 'updated_at', 'personal_info_display', 'guardian_info_display', 'spiritual_info_display')
    ordering = ('-created_at',)

    fieldsets = (
        ('Registration Details', {
            'fields': ('user', 'church', 'status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Personal Information (Required)', {
            'fields': ('personal_info_display',),
            'classes': ('collapse',)
        }),
        ('Guardian Information (Optional)', {
            'fields': ('guardian_info_display',),
            'classes': ('collapse',)
        }),
        ('Spiritual Information (Optional)', {
            'fields': ('spiritual_info_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def personal_info_display(self, obj):
        info = obj.personal_info or {}
        return format_html(
            '<strong>Full Name:</strong> {}<br>'
            '<strong>Email:</strong> {}<br>'
            '<strong>Phone:</strong> {}<br>'
            '<strong>Neighborhood:</strong> {}',
            info.get('full_name', 'N/A'),
            info.get('email', 'N/A'),
            info.get('phone', 'N/A'),
            info.get('neighborhood', 'N/A')
        )
    personal_info_display.short_description = 'Personal Information (Required Fields)'

    def guardian_info_display(self, obj):
        info = obj.guardian_info or {}
        return format_html(
            '<strong>Guardian Name:</strong> {}<br>'
            '<strong>Guardian Phone:</strong> {}<br>'
            '<strong>Relationship:</strong> {}',
            info.get('guardian_name', 'N/A'),
            info.get('guardian_phone', 'N/A'),
            info.get('relationship', 'N/A')
        )
    guardian_info_display.short_description = 'Guardian Information (Optional)'

    def spiritual_info_display(self, obj):
        info = obj.spiritual_info or {}
        gifts = ', '.join(info.get('spiritual_gifts', [])) if info.get('spiritual_gifts') else 'None'
        interests = ', '.join(info.get('ministry_interests', [])) if info.get('ministry_interests') else 'None'
        return format_html(
            '<strong>Date of Birth:</strong> {}<br>'
            '<strong>Christian Birth Date:</strong> {}<br>'
            '<strong>Spiritual Gifts:</strong> {}<br>'
            '<strong>Ministry Interests:</strong> {}',
            info.get('date_of_birth', 'N/A'),
            info.get('christian_birth_date', 'N/A'),
            gifts,
            interests
        )
    spiritual_info_display.short_description = 'Spiritual Information (Optional)'

    def actions(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<a class="button" href="{}">Approve</a> '
                '<a class="button" href="{}">Reject</a>',
                f'/admin/members/memberregistration/{obj.id}/approve/',
                f'/admin/members/memberregistration/{obj.id}/reject/'
            )
        return 'N/A'
    actions.short_description = 'Actions'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:registration_id>/approve/', self.admin_site.admin_view(self.approve_registration), name='approve_registration'),
            path('<int:registration_id>/reject/', self.admin_site.admin_view(self.reject_registration), name='reject_registration'),
        ]
        return custom_urls + urls

    def approve_registration(self, request, registration_id):
        registration = self.get_object(request, registration_id)
        if registration.status != 'pending':
            messages.error(request, 'Registration is not pending.')
            return redirect('admin:members_memberregistration_changelist')

        # Create user account
        user = registration.user
        user.is_approved = True
        user.approved_by = request.user
        user.approved_at = timezone.now()
        user.save()

        registration.status = 'approved'
        registration.approved_by = request.user
        registration.approved_at = timezone.now()
        registration.save()

        messages.success(request, f'Registration for {user.full_name} has been approved.')
        return redirect('admin:members_memberregistration_changelist')

    def reject_registration(self, request, registration_id):
        registration = self.get_object(request, registration_id)
        if registration.status != 'pending':
            messages.error(request, 'Registration is not pending.')
            return redirect('admin:members_memberregistration_changelist')

        if request.method == 'POST':
            reason = request.POST.get('rejection_reason', '')
            registration.status = 'rejected'
            registration.rejection_reason = reason
            registration.save()

            messages.success(request, f'Registration for {registration.user.full_name} has been rejected.')
            return redirect('admin:members_memberregistration_changelist')

        context = {
            'registration': registration,
            'title': f'Reject Registration: {registration.user.full_name}'
        }
        return render(request, 'admin/members/reject_registration.html', context)

    def has_change_permission(self, request, obj=None):
        if request.user.role == 'national_leader':
            return True
        if obj and obj.church != request.user.church:
            return False
        return super().has_change_permission(request, obj)