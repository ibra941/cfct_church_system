import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.churches.models import Church
from django.contrib.auth.hashers import make_password

def create_leadership_users():
    print("=" * 60)
    print("CREATING LEADERSHIP USERS")
    print("=" * 60)
    
    # Get all zones
    zones = Church.objects.filter(church_type='zone')
    print(f"\n📊 Found {zones.count()} Zones")
    
    # Get all regions
    regions = Church.objects.filter(church_type='region')
    print(f"📊 Found {regions.count()} Regions")
    
    # Get all districts
    districts = Church.objects.filter(church_type='district')
    print(f"📊 Found {districts.count()} Districts")
    
    # ============================================
    # Create Zone Leaders (1 per zone)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING ZONE LEADERS")
    print("=" * 60)
    
    zone_leaders = []
    for zone in zones:
        username = f"zone_leader_{zone.code.lower()}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{zone.code.lower()}@cfct.or.tz",
                'full_name': f"{zone.name} Leader",
                'role': 'zone_leader',
                'church': zone,
                'is_active': True,
                'is_approved': True,
                'is_staff': True,
                'password': make_password('Zone@123')
            }
        )
        zone_leaders.append(user)
        if created:
            print(f"  ✅ Created: {user.username} - {zone.name}")
        else:
            print(f"  ⚠️ Already exists: {user.username}")
    
    # ============================================
    # Create Regional Leaders (1 per region)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING REGIONAL LEADERS")
    print("=" * 60)
    
    regional_leaders = []
    for region in regions:
        # Get zone name from region's parent
        zone_name = region.parent_church.name if region.parent_church else "Unknown"
        username = f"regional_leader_{region.code.lower()}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{region.code.lower()}@cfct.or.tz",
                'full_name': f"{region.name} Leader",
                'role': 'regional_leader',
                'church': region,
                'is_active': True,
                'is_approved': True,
                'is_staff': True,
                'password': make_password('Regional@123')
            }
        )
        regional_leaders.append(user)
        if created:
            print(f"  ✅ Created: {user.username} - {region.name} (Zone: {zone_name})")
        else:
            print(f"  ⚠️ Already exists: {user.username}")
    
    # ============================================
    # Create District Leaders (1 per district)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING DISTRICT LEADERS")
    print("=" * 60)
    
    district_leaders = []
    for district in districts:
        # Get region name from district's parent
        region_name = district.parent_church.name if district.parent_church else "Unknown"
        username = f"district_leader_{district.code.lower()}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{district.code.lower()}@cfct.or.tz",
                'full_name': f"{district.name} Leader",
                'role': 'district_leader',
                'church': district,
                'is_active': True,
                'is_approved': True,
                'is_staff': True,
                'password': make_password('District@123')
            }
        )
        district_leaders.append(user)
        if created:
            print(f"  ✅ Created: {user.username} - {district.name} (Region: {region_name})")
        else:
            print(f"  ⚠️ Already exists: {user.username}")
    
    # ============================================
    # Create Local Church Leaders (Sample)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING SAMPLE LOCAL CHURCH LEADERS")
    print("=" * 60)
    
    local_churches = Church.objects.filter(church_type='local')[:20]  # Sample local churches
    for local in local_churches:
        username = f"local_leader_{local.code.lower()}" if local.code else f"local_leader_{local.id}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@cfct.or.tz",
                'full_name': f"{local.name} Leader",
                'role': 'local_leader',
                'church': local,
                'is_active': True,
                'is_approved': True,
                'is_staff': False,
                'password': make_password('Local@123')
            }
        )
        if created:
            print(f"  ✅ Created: {user.username} - {local.name}")
    
    # ============================================
    # SUMMARY
    # ============================================
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Zone Leaders Created: {len(zone_leaders)}")
    print(f"Regional Leaders Created: {len(regional_leaders)}")
    print(f"District Leaders Created: {len(district_leaders)}")
    
    print("\n" + "=" * 60)
    print("LOGIN CREDENTIALS")
    print("=" * 60)
    print("\nZone Leaders (Password: Zone@123):")
    for leader in zone_leaders[:5]:  # Show first 5
        print(f"  - {leader.username}: {leader.church.name}")
    if len(zone_leaders) > 5:
        print(f"  ... and {len(zone_leaders)-5} more")
    
    print("\nRegional Leaders (Password: Regional@123):")
    for leader in regional_leaders[:5]:
        print(f"  - {leader.username}: {leader.church.name}")
    if len(regional_leaders) > 5:
        print(f"  ... and {len(regional_leaders)-5} more")
    
    print("\nDistrict Leaders (Password: District@123):")
    for leader in district_leaders[:5]:
        print(f"  - {leader.username}: {leader.church.name}")
    if len(district_leaders) > 5:
        print(f"  ... and {len(district_leaders)-5} more")
    
    print("\n✅ Leadership users created successfully!")

if __name__ == '__main__':
    create_leadership_users()