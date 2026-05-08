import traceback
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import User
from apps.churches.models import Church
from apps.api.views import DashboardStatsView, MemberViewSet, ChurchViewSet

factory = APIRequestFactory()


def summarize_dashboard(label, response):
    data = getattr(response, 'data', None)
    if not isinstance(data, dict):
        print(f'{label}: status={getattr(response, "status_code", None)} data_type={type(data).__name__}')
        print(data)
        return
    keys = [
        'total_members', 'total_churches', 'zones', 'regions', 'districts', 'locals',
        'pending_approvals', 'total_offerings', 'total_events', 'prayer_requests',
        'weekly_attendance', 'attendance_rate', 'monthly_growth'
    ]
    summary = ', '.join(f'{k}={data.get(k)}' for k in keys)
    recent_count = len(data.get('recent_members') or [])
    print(f'{label}: status={response.status_code}; {summary}; recent_members={recent_count}')


def summarize_list(label, response):
    data = getattr(response, 'data', None)
    if isinstance(data, dict):
        count = data.get('count')
        results = data.get('results')
        if isinstance(results, list):
            print(f'{label}: status={response.status_code}; count={count}; results_returned={len(results)}')
            for idx, item in enumerate(results[:3], 1):
                print(f'  item{idx}: id={item.get("id")}; username={item.get("username")}; full_name={item.get("full_name")}; church={(item.get("church_details") or {}).get("name") if isinstance(item, dict) else None}; name={item.get("name")}')
        else:
            print(f'{label}: status={response.status_code}; keys={list(data.keys())}')
            print(data)
    elif isinstance(data, list):
        print(f'{label}: status={response.status_code}; count={len(data)}')
        for idx, item in enumerate(data[:3], 1):
            print(f'  item{idx}: id={item.get("id")}; username={item.get("username")}; full_name={item.get("full_name")}; name={item.get("name")}')
    else:
        print(f'{label}: status={getattr(response, "status_code", None)} data_type={type(data).__name__}')
        print(data)


user = User.objects.filter(role='national_leader').order_by('id').first()
print('AUTH_USER')
if user is None:
    print('No national_leader user found')
else:
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

print('FILTER_CONTEXT')
print(f'zone_id={getattr(zone, "id", None)}; zone_name={getattr(zone, "name", None)}')
print(f'region_id={getattr(region, "id", None)}; region_name={getattr(region, "name", None)}')
print(f'district_id={getattr(district, "id", None)}; district_name={getattr(district, "name", None)}')
print(f'local_id={getattr(local, "id", None)}; local_name={getattr(local, "name", None)}')


def run_dashboard(label, params):
    try:
        request = factory.get('/api/dashboard/stats/', params)
        force_authenticate(request, user=user)
        response = DashboardStatsView.as_view()(request)
        summarize_dashboard(label, response)
    except Exception:
        print(f'{label}: EXCEPTION')
        traceback.print_exc()


def run_member_list(label, params):
    try:
        request = factory.get('/api/members/', params)
        force_authenticate(request, user=user)
        response = MemberViewSet.as_view({'get': 'list'})(request)
        summarize_list(label, response)
    except Exception:
        print(f'{label}: EXCEPTION')
        traceback.print_exc()


def run_church_list(label, params):
    try:
        request = factory.get('/api/churches/', params)
        force_authenticate(request, user=user)
        response = ChurchViewSet.as_view({'get': 'list'})(request)
        summarize_list(label, response)
    except Exception:
        print(f'{label}: EXCEPTION')
        traceback.print_exc()


if user is not None:
    run_dashboard('1) DashboardStatsView no filters', {})
    run_dashboard('2) DashboardStatsView zone_id', {'zone_id': str(zone.id)} if zone else {})
    run_dashboard('3) DashboardStatsView region_id', {'region_id': str(region.id)} if region else {})
    run_member_list('4) MemberViewSet list zone_id limit=3', {'zone_id': str(zone.id), 'limit': '3'} if zone else {'limit': '3'})
    run_church_list('5) ChurchViewSet list church_type=local district_id', {'church_type': 'local', 'district_id': str(district.id)} if district else {'church_type': 'local'})
