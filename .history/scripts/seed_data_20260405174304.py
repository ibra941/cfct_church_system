import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.churches.models import Church
from django.contrib.auth.hashers import make_password

def seed_data():
    print("Seeding initial data...")
    
    # Create national church
    national_church, created = Church.objects.get_or_create(
        code='CFCT-NAT-001',
        defaults={
            'name': 'Christian Fellowship Church Tanzania',
            'church_type': 'national',
            'country': 'Tanzania',
            'is_active': True
        }
    )
    print(f"✅ National church: {national_church.name}")

    # Create superuser
    superuser, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@cfct.or.tz',
            'full_name': 'System Administrator',
            'role': 'national_leader',
            'is_active': True,
            'is_approved': True,
            'is_superuser': True,
            'is_staff': True,
            'church': national_church,
            'password': make_password('Admin@123')
        }
    )
    print(f"✅ Superuser: {superuser.username}")

    # Create sample zone church
    zone_church, created = Church.objects.get_or_create(
        code='CFCT-ZONE-001',
        defaults={
            'name': 'Dar es Salaam Zone',
            'church_type': 'zone',
            'parent_church': national_church,
            'is_active': True
        }
    )
    print(f"✅ Zone church: {zone_church.name}")

    # Create sample region church
    region_church, created = Church.objects.get_or_create(
        code='CFCT-REG-001',
        defaults={
            'name': 'Ilala Region',
            'church_type': 'region',
            'parent_church': zone_church,
            'is_active': True
        }
    )
    print(f"✅ Region church: {region_church.name}")

    # Create sample district church
    district_church, created = Church.objects.get_or_create(
        code='CFCT-DIST-001',
        defaults={
            'name': 'Kariakoo District',
            'church_type': 'district',
            'parent_church': region_church,
            'is_active': True
        }
    )
    print(f"✅ District church: {district_church.name}")

    print("\n🎉 Seeding completed successfully!")
    print("\nLogin credentials:")
    print("  Username: admin")
    print("  Password: Admin@123")

if __name__ == '__main__':
    seed_data()