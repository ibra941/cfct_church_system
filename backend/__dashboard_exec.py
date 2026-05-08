from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import User
from apps.churches.models import Church
from apps.api.views import DashboardStatsView

factory = APIRequestFactory()

user = User.objects.filter(role='national_leader').order_by('id').first()
print('AUTH_USER')
if not user:
    print('No national_leader user found')
    raise SystemExit(0)
print(f'id={user.id}; username={user.username}; full_name={user.full_name}; role={user.role}; church_id={user.church_id}')

local = Church.objects.filter(
    church_type='local',
    parent_church__church_type='district',
    parent_church__parent_church__church_type='region',
    parent_church__parent_church__parent_church__church_type='zone',
).select_related('parent_church__parent_church__parent_church').order_by('id').first()

district = local.parent_church if local else Church.objects.filter(church_type='district').select_related('parent_church').order_by('id').first()
region = district.parent_church if district and getattr(district, 'parent_church', None) and district.parent_church.church_type == 'region' else Church.objects.filter(church_type='region').select_related('parent_church').order_by('id').first()
zone = region.parent_church if region and getattr(region, 'parent_church', None) and region.parent_church.church_type == 'zone' else Church.objects.filter(church_type='zone').order_by('id').first()
church_name = local.name if local else ''

print('FILTER_CONTEXT')
print(f'zone_id={getattr(zone, "id", None)}; zone_name={getattr(zone, "name", None)}')
print(f'region_id={getattr(region, "id", None)}; region_name={getattr(region, "name", None)}')
print(f'district_id={getattr(district, "id", None)}; district_name={getattr(district, "name", None)}')
print(f'church_name={church_name}')

def run_case(label, params):
    request = factory.get('/api/dashboard/stats/', params)
    force_authenticate(request, user=user)
    response = DashboardStatsView.as_view()(request)
    data = response.data if hasattr(response, 'data') else {}
    print(
        f"{label}: status={response.status_code}; total_churches={data.get('total_churches')}; total_members={data.get('total_members')}; zones={data.get('zones')}; regions={data.get('regions')}; districts={data.get('districts')}; locals={data.get('locals')}"
    )

run_case('1) no filters', {})
run_case('2) zone_id only', {'zone_id': str(zone.id)} if zone else {})
run_case('3) region_id only', {'region_id': str(region.id)} if region else {})
run_case('4) district_id only', {'district_id': str(district.id)} if district else {})
run_case('5) zone_id + church_name', {'zone_id': str(zone.id), 'church_name': church_name} if zone and church_name else {})
