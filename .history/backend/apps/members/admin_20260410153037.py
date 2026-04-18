from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect, render
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import MemberRegistration
from apps.accounts.models import User
from apps.churches.models import Church


@admin.register(MemberRegistration)
class MemberRegistrationAdmin(admin.ModelAdmin):
    list_display = ('user', 'church', 'status', 'created_at', 'personal_info_display', 'guardian_info_display', 'spiritual_info_display', 'admin_actions')
    list_filter = ('status', 'created_at', 'church')
    search_fields = ('user__username', 'user__email', 'user__full_name', 'church__name')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['bulk_approve', 'bulk_reject', 'bulk_delete_members']

    fieldsets = (
        ('Registration Details', {
            'fields': ('user', 'church', 'status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Personal Information', {
            'fields': ('personal_info',),
            'classes': ('collapse',)
        }),
        ('Guardian Information', {
            'fields': ('guardian_info',),
            'classes': ('collapse',)
        }),
        ('Spiritual Information', {
            'fields': ('spiritual_info',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
        updated = 0
        for registration in queryset.filter(status='pending'):
            registration.status = 'approved'
            registration.approved_by = request.user
            registration.approved_at = timezone.now()
            registration.save()
            
            # Update user status
            user = registration.user
            user.is_approved = True
            user.approved_by = request.user
            user.approved_at = timezone.now()
            user.save()
            updated += 1
        
        self.message_user(request, f'Successfully approved {updated} member registrations.')
    bulk_approve.short_description = 'Approve selected registrations'

    def bulk_reject(self, request, queryset):
        updated = 0
        for registration in queryset.filter(status='pending'):
            registration.status = 'rejected'
            registration.save()
            updated += 1
        
        self.message_user(request, f'Successfully rejected {updated} member registrations.')
    bulk_reject.short_description = 'Reject selected registrations'

    def bulk_delete_members(self, request, queryset):
        deleted = 0
        for registration in queryset:
            user = registration.user
            registration.delete()
            user.delete()
            deleted += 1
        
        self.message_user(request, f'Successfully deleted {deleted} members and their registrations.')
    bulk_delete_members.short_description = 'Delete selected members (irreversible)'

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['register_member_url'] = 'register-member/'
        return super().changelist_view(request, extra_context)

    fieldsets = (
        ('Registration Details', {
            'fields': ('user', 'church', 'status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Personal Information', {
            'fields': ('personal_info',),
            'classes': ('collapse',)
        }),
        ('Guardian Information', {
            'fields': ('guardian_info',),
            'classes': ('collapse',)
        }),
        ('Spiritual Information', {
            'fields': ('spiritual_info',),
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

    def admin_actions(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<a class="button" href="{}">Approve</a> '
                '<a class="button" href="{}">Reject</a>',
                f'/admin/members/memberregistration/{obj.id}/approve/',
                f'/admin/members/memberregistration/{obj.id}/reject/'
            )
        return 'N/A'
    admin_actions.short_description = 'Actions'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:registration_id>/approve/', self.admin_site.admin_view(self.approve_registration), name='approve_registration'),
            path('<int:registration_id>/reject/', self.admin_site.admin_view(self.reject_registration), name='reject_registration'),
            path('register-member/', self.admin_site.admin_view(self.register_member_view), name='register_member'),
            path('api/zones/', self.admin_site.admin_view(self.get_zones), name='get_zones'),
            path('api/regions/', self.admin_site.admin_view(self.get_regions), name='get_regions'),
            path('api/districts/', self.admin_site.admin_view(self.get_districts), name='get_districts'),
            path('api/churches/', self.admin_site.admin_view(self.get_churches), name='get_churches'),
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

    def register_member_view(self, request):
        if request.method == 'POST':
            # Handle member registration
            username = request.POST.get('username')
            email = request.POST.get('email')
            full_name = request.POST.get('full_name')
            phone = request.POST.get('phone')
            password = request.POST.get('password')
            church_id = request.POST.get('church_id')

            # Personal info
            neighborhood = request.POST.get('neighborhood', '')

            # Guardian info
            guardian_name = request.POST.get('guardian_name', '')
            guardian_phone = request.POST.get('guardian_phone', '')
            guardian_relationship = request.POST.get('guardian_relationship', '')

            # Spiritual info
            date_of_birth = request.POST.get('date_of_birth') or None
            christian_birth_date = request.POST.get('christian_birth_date') or None
            spiritual_gifts = request.POST.getlist('spiritual_gifts[]')
            ministry_interests = request.POST.getlist('ministry_interests[]')

            if not all([username, email, full_name, phone, password, church_id]):
                messages.error(request, 'Username, email, full name, phone, password, and church are required.')
                return redirect('admin:register_member')

            try:
                church = Church.objects.get(id=church_id)

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    full_name=full_name,
                    phone=phone,
                    role='local_member',
                    church=church,
                    is_active=True,
                    is_approved=True,
                    approved_by=request.user,
                    approved_at=timezone.now(),
                    neighborhood=neighborhood,
                    guardian_name=guardian_name,
                    guardian_phone=guardian_phone,
                    guardian_relationship=guardian_relationship,
                    date_of_birth=date_of_birth,
                    christian_birth_date=christian_birth_date,
                    spiritual_gifts=spiritual_gifts,
                    ministry_interests=ministry_interests
                )

                # Create registration record for consistency
                MemberRegistration.objects.create(
                    user=user,
                    church=church,
                    personal_info={
                        'full_name': full_name,
                        'email': email,
                        'phone': phone,
                        'neighborhood': neighborhood
                    },
                    guardian_info={
                        'guardian_name': guardian_name,
                        'guardian_phone': guardian_phone,
                        'relationship': guardian_relationship
                    },
                    spiritual_info={
                        'date_of_birth': date_of_birth,
                        'christian_birth_date': christian_birth_date,
                        'spiritual_gifts': spiritual_gifts,
                        'ministry_interests': ministry_interests
                    },
                    status='approved',
                    approved_by=request.user,
                    approved_at=timezone.now()
                )

                messages.success(request, f'Member {full_name} registered successfully.')
                return redirect('admin:members_memberregistration_changelist')
            except Church.DoesNotExist:
                messages.error(request, 'Selected church not found.')
            except Exception as e:
                messages.error(request, f'Error registering member: {str(e)}')

        # Get data for the form
        zones = Church.objects.filter(church_type='zone')
        context = {
            'title': 'Register New Member',
            'zones': zones,
            'opts': self.model._meta,
        }
        return render(request, 'admin/members/register_member.html', context)

    def get_zones(self, request):
        zones = Church.objects.filter(church_type='zone').values('id', 'name')
        return JsonResponse(list(zones), safe=False)

    def get_regions(self, request):
        zone_id = request.GET.get('zone_id')
        if zone_id:
            regions = Church.objects.filter(church_type='region', parent_church_id=zone_id).values('id', 'name')
        else:
            regions = Church.objects.filter(church_type='region').values('id', 'name')
        return JsonResponse(list(regions), safe=False)

    def get_districts(self, request):
        region_id = request.GET.get('region_id')
        if region_id:
            districts = Church.objects.filter(church_type='district', parent_church_id=region_id).values('id', 'name')
        else:
            districts = Church.objects.filter(church_type='district').values('id', 'name')
        return JsonResponse(list(districts), safe=False)

    def get_churches(self, request):
        district_id = request.GET.get('district_id')
        if district_id:
            churches = Church.objects.filter(church_type='local', parent_church_id=district_id).values('id', 'name')
        else:
            churches = Church.objects.filter(church_type='local').values('id', 'name')
        return JsonResponse(list(churches), safe=False)

    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        if request.user.role == 'national_leader':
            return True
        if obj and obj.church != request.user.church:
            return False
        return super().has_change_permission(request, obj)