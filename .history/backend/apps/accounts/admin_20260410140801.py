from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from django.shortcuts import render, redirect
from django.contrib import messages
from django.urls import path
from django.http import JsonResponse
from django.utils.html import format_html
from .models import User
from apps.churches.models import Church


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'church', 'is_approved', 'is_active', 'is_superuser', 'admin_actions')
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

    def admin_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">Transfer/Promote</a>',
            f'/admin/accounts/user/{obj.id}/transfer/'
        )
    admin_actions.short_description = 'Actions'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('register-leader/', self.admin_site.admin_view(self.register_leader_view), name='register_leader'),
            path('<int:user_id>/transfer/', self.admin_site.admin_view(self.transfer_user), name='user_transfer'),
            path('api/zones/', self.admin_site.admin_view(self.get_zones), name='get_zones'),
            path('api/regions/', self.admin_site.admin_view(self.get_regions), name='get_regions'),
            path('api/districts/', self.admin_site.admin_view(self.get_districts), name='get_districts'),
            path('api/churches/', self.admin_site.admin_view(self.get_churches), name='get_churches'),
        ]
        return custom_urls + urls

    def register_leader_view(self, request):
        if request.method == 'POST':
            # Handle leader registration
            role = request.POST.get('role')
            church_id = request.POST.get('church_id')
            username = request.POST.get('username')
            email = request.POST.get('email')
            full_name = request.POST.get('full_name')
            phone = request.POST.get('phone')
            password = request.POST.get('password')

            if not all([role, username, email, full_name, password]):
                messages.error(request, 'All fields are required.')
                return redirect('admin:register_leader')

            try:
                church = None
                if church_id:
                    church = Church.objects.get(id=church_id)

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    full_name=full_name,
                    phone=phone,
                    role=role,
                    church=church,
                    is_active=True,
                    is_approved=True
                )
                messages.success(request, f'Leader {full_name} registered successfully.')
                return redirect('admin:accounts_user_changelist')
            except Exception as e:
                messages.error(request, f'Error registering leader: {str(e)}')

        # Get data for the form
        zones = Church.objects.filter(church_type='zone')
        context = {
            'title': 'Register New Leader',
            'zones': zones,
            'opts': self.model._meta,
        }
        return render(request, 'admin/accounts/register_leader.html', context)

    def transfer_user(self, request, user_id):
        user = self.get_object(request, user_id)
        if request.method == 'POST':
            new_role = request.POST.get('new_role')
            new_church_id = request.POST.get('new_church')

            if new_role:
                user.role = new_role

            if new_church_id:
                try:
                    new_church = Church.objects.get(id=new_church_id)
                    user.church = new_church
                except Church.DoesNotExist:
                    messages.error(request, 'Invalid church selected.')

            user.save()
            messages.success(request, f'User {user.username} has been updated successfully.')
            return redirect('admin:accounts_user_changelist')

        # Get appropriate churches based on role
        zones = Church.objects.filter(church_type='zone')
        context = {
            'user': user,
            'title': f'Manage User: {user.username}',
            'zones': zones,
        }
        return render(request, 'admin/accounts/transfer_user.html', context)

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

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_authenticated:
            return qs.none()
        if request.user.role == 'national_leader':
            return qs
        elif request.user.role == 'zone_leader':
            return qs.filter(church__parent_church=request.user.church)
        elif request.user.role == 'regional_leader':
            return qs.filter(church__parent_church__parent_church=request.user.church)
        elif request.user.role == 'district_leader':
            return qs.filter(church=request.user.church)
        return qs.filter(id=request.user.id)

    def has_change_permission(self, request, obj=None):
        if not request.user.is_authenticated:
            return False
        if request.user.role == 'national_leader':
            return True
        if obj and obj.church != request.user.church:
            return False
        return super().has_change_permission(request, obj)