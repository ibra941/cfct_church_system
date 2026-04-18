from django import forms
from django.contrib import admin, messages
from django.db import models as db_models
from django.utils.html import format_html
from .models import Church, Zone, Region, District, LocalChurch
from apps.accounts.models import User


# ── Shared helpers ────────────────────────────────────────────────────────

LOCATION_FIELDS = ('address', 'city', 'country')
CONTACT_FIELDS  = ('phone', 'email')


def _count_link(obj, child_type, admin_url_name, label):
    n = Church.objects.filter(parent_church=obj, church_type=child_type).count()
    url = f'/admin/churches/{admin_url_name}/?parent_church__id__exact={obj.pk}'
    return format_html('<a href="{}">{} {}</a>', url, n, label)


# ── Inline classes ────────────────────────────────────────────────────────

class RegionInline(admin.TabularInline):
    model = Region
    fk_name = 'parent_church'
    fields = ('name', 'code', 'city', 'phone', 'is_active')
    extra = 1
    show_change_link = True
    verbose_name = 'Region'
    verbose_name_plural = 'Regions in this Zone'

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='region')

    def save_new_instance(self, form, commit=True):
        obj = form.save(commit=False)
        obj.church_type = 'region'
        if commit:
            obj.save()
        return obj

    def get_formset(self, request, obj=None, **kwargs):
        fs = super().get_formset(request, obj, **kwargs)
        # Force church_type to 'region' on save
        original_save = fs.save
        class FS(fs):
            def save(self_fs, commit=True):
                instances = super().save(commit=False)
                for inst in instances:
                    inst.church_type = 'region'
                    if commit:
                        inst.save()
                if commit:
                    self_fs.save_m2m()
                return instances
        return fs


class DistrictInline(admin.TabularInline):
    model = District
    fk_name = 'parent_church'
    fields = ('name', 'code', 'city', 'phone', 'is_active')
    extra = 1
    show_change_link = True
    verbose_name = 'District'
    verbose_name_plural = 'Districts in this Region'

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='district')


class LocalChurchInline(admin.TabularInline):
    model = LocalChurch
    fk_name = 'parent_church'
    fields = ('name', 'code', 'city', 'phone', 'is_active')
    extra = 1
    show_change_link = True
    verbose_name = 'Local Church'
    verbose_name_plural = 'Local Churches in this District'

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='local')


# ── Zone admin ────────────────────────────────────────────────────────────

@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    inlines = [RegionInline]
    list_display = ('name', 'code', 'city', 'phone', 'is_active', 'region_count')
    list_filter = ('is_active',)
    search_fields = ('name', 'code', 'city')
    ordering = ('name',)
    fieldsets = (
        (None, {'fields': ('name', 'code')}),
        ('Location', {'fields': LOCATION_FIELDS}),
        ('Contact', {'fields': CONTACT_FIELDS}),
        ('Status', {'fields': ('is_active', 'established_date')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='zone')

    def save_model(self, request, obj, form, change):
        obj.church_type = 'zone'
        national = Church.objects.filter(church_type='national').first()
        if national and not obj.parent_church_id:
            obj.parent_church = national
        super().save_model(request, obj, form, change)

    def region_count(self, obj):
        return _count_link(obj, 'region', 'region', 'Region(s)')
    region_count.short_description = 'Regions'


# ── Region admin ──────────────────────────────────────────────────────────

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    inlines = [DistrictInline]
    list_display = ('name', 'code', 'parent_zone', 'city', 'is_active', 'district_count')
    list_filter = ('is_active', 'parent_church')
    search_fields = ('name', 'code', 'city')
    ordering = ('parent_church__name', 'name')
    fieldsets = (
        (None, {'fields': ('name', 'code', 'parent_church')}),
        ('Location', {'fields': LOCATION_FIELDS}),
        ('Contact', {'fields': CONTACT_FIELDS}),
        ('Status', {'fields': ('is_active', 'established_date')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='region')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'parent_church':
            kwargs['queryset'] = Church.objects.filter(church_type='zone').order_by('name')
            kwargs['label'] = 'Zone'
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        obj.church_type = 'region'
        super().save_model(request, obj, form, change)

    def parent_zone(self, obj):
        return obj.parent_church.name if obj.parent_church else '—'
    parent_zone.short_description = 'Zone'
    parent_zone.admin_order_field = 'parent_church__name'

    def district_count(self, obj):
        return _count_link(obj, 'district', 'district', 'District(s)')
    district_count.short_description = 'Districts'


# ── District admin ────────────────────────────────────────────────────────

@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    inlines = [LocalChurchInline]
    list_display = ('name', 'code', 'parent_region', 'parent_zone', 'city', 'is_active', 'church_count')
    list_filter = ('is_active', 'parent_church', 'parent_church__parent_church')
    search_fields = ('name', 'code', 'city')
    ordering = ('parent_church__parent_church__name', 'parent_church__name', 'name')
    fieldsets = (
        (None, {'fields': ('name', 'code', 'parent_church')}),
        ('Location', {'fields': LOCATION_FIELDS}),
        ('Contact', {'fields': CONTACT_FIELDS}),
        ('Status', {'fields': ('is_active', 'established_date')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='district')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'parent_church':
            kwargs['queryset'] = Church.objects.filter(church_type='region').order_by('parent_church__name', 'name')
            kwargs['label'] = 'Region'
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        obj.church_type = 'district'
        super().save_model(request, obj, form, change)

    def parent_region(self, obj):
        return obj.parent_church.name if obj.parent_church else '—'
    parent_region.short_description = 'Region'
    parent_region.admin_order_field = 'parent_church__name'

    def parent_zone(self, obj):
        if obj.parent_church and obj.parent_church.parent_church:
            return obj.parent_church.parent_church.name
        return '—'
    parent_zone.short_description = 'Zone'

    def church_count(self, obj):
        return _count_link(obj, 'local', 'localchurch', 'Church(es)')
    church_count.short_description = 'Churches'


# ── Local Church admin ────────────────────────────────────────────────────

@admin.register(LocalChurch)
class LocalChurchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'parent_district', 'parent_region', 'parent_zone', 'city', 'phone', 'is_active')
    list_filter = ('is_active', 'parent_church', 'parent_church__parent_church',
                   'parent_church__parent_church__parent_church')
    search_fields = ('name', 'code', 'city', 'phone', 'email')
    ordering = ('parent_church__parent_church__parent_church__name',
                'parent_church__parent_church__name',
                'parent_church__name', 'name')
    fieldsets = (
        (None, {'fields': ('name', 'code', 'parent_church')}),
        ('Location', {'fields': ('address', 'city', 'country')}),
        ('Contact', {'fields': CONTACT_FIELDS}),
        ('Media', {'fields': ('logo',)}),
        ('Status', {'fields': ('is_active', 'established_date')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='local')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'parent_church':
            kwargs['queryset'] = Church.objects.filter(church_type='district').order_by(
                'parent_church__parent_church__name', 'parent_church__name', 'name'
            )
            kwargs['label'] = 'District'
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        obj.church_type = 'local'
        super().save_model(request, obj, form, change)

    def parent_district(self, obj):
        return obj.parent_church.name if obj.parent_church else '—'
    parent_district.short_description = 'District'
    parent_district.admin_order_field = 'parent_church__name'

    def parent_region(self, obj):
        if obj.parent_church and obj.parent_church.parent_church:
            return obj.parent_church.parent_church.name
        return '—'
    parent_region.short_description = 'Region'

    def parent_zone(self, obj):
        try:
            return obj.parent_church.parent_church.parent_church.name
        except AttributeError:
            return '—'
    parent_zone.short_description = 'Zone'


# ── National Church admin (kept for editing the top-level record) ─────────

class ZoneInline(admin.TabularInline):
    model = Zone
    fk_name = 'parent_church'
    fields = ('name', 'code', 'city', 'is_active')
    extra = 0
    show_change_link = True
    verbose_name = 'Zone'
    verbose_name_plural = 'Zones'

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='zone')


@admin.register(Church)
class ChurchAdmin(admin.ModelAdmin):
    """Kept only for the national-level church record."""
    inlines = [ZoneInline]
    list_display = ('name', 'church_type', 'parent_church', 'is_active', 'city')
    list_filter = ('church_type', 'is_active')
    search_fields = ('name', 'code', 'city')
    ordering = ('church_type', 'name')
    fieldsets = (
        (None, {'fields': ('name', 'code', 'church_type', 'parent_church')}),
        ('Location', {'fields': ('address', 'city', 'region', 'country')}),
        ('Contact', {'fields': CONTACT_FIELDS}),
        ('Media', {'fields': ('logo',)}),
        ('Status', {'fields': ('is_active', 'established_date')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(church_type='national')

    def delete_queryset(self, request, queryset):
        for church in queryset:
            User.objects.filter(church=church).update(church=None)
            church.delete()
        messages.success(request, f'Successfully deleted {queryset.count()} church(es).')

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

    def admin_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">Transfer</a>',
            f'/admin/churches/church/{obj.id}/transfer/'
        )
    admin_actions.short_description = 'Actions'

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