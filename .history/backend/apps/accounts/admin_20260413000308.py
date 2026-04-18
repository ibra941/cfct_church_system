from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.shortcuts import render, redirect
from django.contrib import messages
from django.urls import path
from django.http import JsonResponse
from django.utils.html import format_html
from django.utils import timezone
from .models import User
from apps.churches.models import Church


ROLE_TO_CHURCH_TYPE = {
    'zone_leader': 'zone',
    'regional_leader': 'region',
    'district_leader': 'district',
    'local_leader': 'local',
}


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email', 'full_name', 'role', 'church')

    class Media:
        js = ('admin/js/user_role_church_filter.js',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['role'].choices = [
            ('national_leader', 'National Leader'),
            ('zone_leader', 'Zone Leader'),
            ('regional_leader', 'Regional Leader'),
            ('district_leader', 'District Leader'),
            ('local_leader', 'Church Leader'),
        ]

        role = self.data.get('role') or self.initial.get('role')
        church_qs = Church.objects.all().order_by('name')
        if role in ROLE_TO_CHURCH_TYPE:
            church_qs = church_qs.filter(church_type=ROLE_TO_CHURCH_TYPE[role])
        self.fields['church'].queryset = church_qs

    def clean(self):
        cleaned_data = super().clean()
        role = cleaned_data.get('role')
        church = cleaned_data.get('church')

        if role == 'national_leader':
            cleaned_data['church'] = None
            return cleaned_data

        expected_type = ROLE_TO_CHURCH_TYPE.get(role)
        if expected_type and not church:
            raise ValidationError({'church': 'Please select a church for the selected role.'})
        if expected_type and church and church.church_type != expected_type:
            raise ValidationError({'church': f'Selected role requires a {expected_type} church.'})

        return cleaned_data


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm

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
        actions = []
        if not obj.is_approved:
            actions.append(format_html(
                '<a class="button" href="{}">Approve</a>',
                f'/admin/accounts/user/{obj.id}/approve/'
            ))
        if obj.role in ['local_member', 'local_leader']:
            actions.append(format_html(
                '<a class="button" href="{}">Edit Member</a>',
                f'/admin/members/memberregistration/?user={obj.id}'
            ))
        actions.append(format_html(
            '<a class="button" href="{}">Transfer/Promote</a>',
            f'/admin/accounts/user/{obj.id}/transfer/'
        ))
        return format_html(' '.join(actions))
    admin_actions.short_description = 'Actions'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:user_id>/approve/', self.admin_site.admin_view(self.approve_user), name='approve_user'),
            path('register-leader/', self.admin_site.admin_view(self.register_leader_view), name='register_leader'),
            path('<int:user_id>/transfer/', self.admin_site.admin_view(self.transfer_user), name='user_transfer'),
            path('api/zones/', self.admin_site.admin_view(self.get_zones), name='get_zones'),
            path('api/regions/', self.admin_site.admin_view(self.get_regions), name='get_regions'),
            path('api/districts/', self.admin_site.admin_view(self.get_districts), name='get_districts'),
            path('api/churches/', self.admin_site.admin_view(self.get_churches), name='get_churches'),
        ]
        return custom_urls + urls

    def approve_user(self, request, user_id):
        user = self.get_object(request, user_id)
        if user is None:
            messages.error(request, 'User not found.')
            return redirect('admin:accounts_user_changelist')
        if user.is_approved:
            messages.info(request, f'User {user.username} is already approved.')
            return redirect('admin:accounts_user_changelist')

        user.is_approved = True
        user.is_active = True
        user.approved_by = request.user
        user.approved_at = timezone.now()
        user.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at'])
        messages.success(request, f'User {user.username} approved successfully.')
        return redirect('admin:accounts_user_changelist')

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