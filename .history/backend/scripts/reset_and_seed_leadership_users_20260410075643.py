import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from apps.accounts.models import User
from apps.churches.models import Church


def sanitize_username(value):
    sanitized = ''.join(
        ch.lower() if ch.isalnum() else '_' for ch in str(value)
    ).strip('_')
    return sanitized or 'user'


def create_user_if_missing(username, defaults):
    user, created = User.objects.get_or_create(username=username, defaults=defaults)
    if not created:
        for key, value in defaults.items():
            setattr(user, key, value)
        user.save()
    return user, created


def reset_and_seed_users():
    print('\n' + '=' * 60)
    print('RESETTING USERS AND CREATING SAMPLE LEADERSHIP USERS')
    print('=' * 60 + '\n')

    superusers = User.objects.filter(is_superuser=True)
    print(f'Preserving superuser accounts: {superusers.count()}')

    deleted_count, _ = User.objects.filter(is_superuser=False).delete()
    print(f'Deleted {deleted_count} non-superuser accounts')

    national_church = Church.objects.filter(church_type='national').first()
    if not national_church:
        print('ERROR: No national church found. Cannot seed leadership users.')
        return

    print('\nCreating national leader...')
    national_leader, created = create_user_if_missing(
        'national_leader',
        {
            'email': 'national_leader@cfct.or.tz',
            'full_name': 'National Leader',
            'role': 'national_leader',
            'church': national_church,
            'is_active': True,
            'is_approved': True,
            'is_staff': True,
            'password': make_password('National@123'),
        },
    )
    print('   ✅ Created' if created else '   ⚠️ Updated', national_leader.username)

    zones = Church.objects.filter(church_type='zone')
    print(f'\nFound {zones.count()} zones')
    zone_leaders = []
    for zone in zones:
        code = sanitize_username(zone.code or zone.name)
        username = f'zone_leader_{code}'
        user, created = create_user_if_missing(
            username,
            {
                'email': f'{username}@cfct.or.tz',
                'full_name': f'{zone.name} Leader',
                'role': 'zone_leader',
                'church': zone,
                'is_active': True,
                'is_approved': True,
                'is_staff': True,
                'password': make_password('Zone@123'),
            },
        )
        zone_leaders.append(user)
        print(f'  {