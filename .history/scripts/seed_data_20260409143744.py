import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User
from apps.churches.models import Church
from django.contrib.auth.hashers import make_password

def seed_data():
    print("🌍 Seeding Tanzanian Church Hierarchy...")

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

    # Create superuser (National Leader)
    superuser, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@cfct.or.tz',
            'full_name': 'National Administrator',
            'role': 'national_leader',
            'is_active': True,
            'is_approved': True,
            'is_superuser': True,
            'is_staff': True,
            'church': national_church,
            'password': make_password('Admin@123')
        }
    )
    print(f"✅ National Leader: {superuser.username}")

    # Define the complete Tanzanian hierarchy
    zones_data = {
        'Northern Zone': {
            'regions': ['Arusha Region', 'Kilimanjaro Region', 'Tanga Region', 'Manyara Region']
        },
        'Lake Zone': {
            'regions': ['Mwanza Region', 'Geita Region', 'Simiyu Region', 'Mara Region', 'Kagera Region']
        },
        'Central Zone': {
            'regions': ['Dodoma Region', 'Singida Region']
        },
        'Eastern Zone': {
            'regions': ['Dar es Salaam Region', 'Pwani Region', 'Morogoro Region']
        },
        'Southern Highlands Zone': {
            'regions': ['Mbeya Region', 'Iringa Region', 'Njombe Region', 'Songwe Region', 'Rukwa Region', 'Katavi Region']
        },
        'Western Zone': {
            'regions': ['Tabora Region', 'Kigoma Region']
        },
        'Southern Zone': {
            'regions': ['Ruvuma Region', 'Lindi Region', 'Mtwara Region']
        },
        'Zanzibar Zone': {
            'regions': ['Unguja North Region', 'Unguja South Region', 'Urban/West Region', 'Pemba North Region', 'Pemba South Region']
        }
    }

    districts_data = {
        'Arusha Region': ['Arusha City', 'Arusha District', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro'],
        'Dar es Salaam Region': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
        'Dodoma Region': ['Dodoma City', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa'],
        'Geita Region': ['Geita', 'Bukombe', 'Chato', 'Mbogwe', 'Nyang\'hwale'],
        'Iringa Region': ['Iringa Municipal', 'Iringa District', 'Kilolo', 'Mufindi'],
        'Kagera Region': ['Bukoba Municipal', 'Bukoba District', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara'],
        'Katavi Region': ['Mpanda Municipal', 'Mpanda District', 'Mlele'],
        'Kigoma Region': ['Kigoma-Ujiji Municipal', 'Kigoma District', 'Kasulu Town', 'Kasulu District', 'Kibondo', 'Kakonko', 'Uvinza'],
        'Kilimanjaro Region': ['Moshi Municipal', 'Moshi District', 'Hai', 'Siha', 'Mwanga', 'Rombo', 'Same'],
        'Lindi Region': ['Lindi Municipal', 'Lindi District', 'Kilwa', 'Liwale', 'Nachingwea', 'Ruangwa'],
        'Manyara Region': ['Babati Town', 'Babati District', 'Hanang', 'Kiteto', 'Mbulu', 'Simanjiro'],
        'Mara Region': ['Musoma Municipal', 'Musoma District', 'Butiama', 'Rorya', 'Tarime', 'Serengeti', 'Bunda'],
        'Mbeya Region': ['Mbeya City', 'Mbeya District', 'Chunya', 'Kyela', 'Mbarali', 'Rungwe', 'Busokelo'],
        'Morogoro Region': ['Morogoro Municipal', 'Morogoro District', 'Gairo', 'Kilombero', 'Kilosa', 'Mvomero', 'Ulanga', 'Malinyi'],
        'Mtwara Region': ['Mtwara Municipal', 'Mtwara District', 'Masasi Town', 'Masasi District', 'Nanyumbu', 'Newala', 'Tandahimba'],
        'Mwanza Region': ['Nyamagana', 'Ilemela', 'Magu', 'Misungwi', 'Sengerema', 'Kwimba', 'Ukerewe'],
        'Njombe Region': ['Njombe Town', 'Njombe District', 'Ludewa', 'Makambako', 'Wanging\'ombe'],
        'Pwani Region': ['Kibaha Town', 'Kibaha District', 'Bagamoyo', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji'],
        'Rukwa Region': ['Sumbawanga Municipal', 'Sumbawanga District', 'Kalambo', 'Nkasi'],
        'Ruvuma Region': ['Songea Municipal', 'Songea District', 'Mbinga', 'Nyasa', 'Namtumbo', 'Tunduru'],
        'Shinyanga Region': ['Shinyanga Municipal', 'Shinyanga District', 'Kahama Town', 'Kahama District', 'Kishapu'],
        'Simiyu Region': ['Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
        'Singida Region': ['Singida Municipal', 'Singida District', 'Ikungi', 'Iramba', 'Manyoni', 'Mkalama'],
        'Songwe Region': ['Mbozi', 'Ileje', 'Momba', 'Songwe', 'Tunduma'],
        'Tabora Region': ['Tabora Municipal', 'Tabora District', 'Igunga', 'Kaliua', 'Nzega Town', 'Nzega District', 'Sikonge', 'Urambo'],
        'Tanga Region': ['Tanga City', 'Muheza', 'Pangani', 'Korogwe Town', 'Korogwe District', 'Handeni Town', 'Handeni District', 'Kilindi', 'Lushoto', 'Mkinga'],
        'Unguja North Region': ['Kaskazini A', 'Kaskazini B'],
        'Unguja South Region': ['Kati', 'Kusini'],
        'Urban/West Region': ['Magharibi A', 'Magharibi B'],
        'Pemba North Region': ['Micheweni', 'Wete'],
        'Pemba South Region': ['Chake Chake', 'Mkoani']
    }

    created_zones = []
    created_regions = []
    created_districts = []

    # Create zones and their leaders
    for zone_name, zone_info in zones_data.items():
        zone_code = f"CFCT-ZONE-{zone_name.replace(' ', '').upper()[:10]}"
        zone_church, created = Church.objects.get_or_create(
            code=zone_code,
            defaults={
                'name': zone_name,
                'church_type': 'zone',
                'parent_church': national_church,
                'is_active': True
            }
        )
        created_zones.append(zone_church)
        print(f"✅ Zone: {zone_church.name}")

        # Create zone leader
        zone_username = zone_name.lower().replace(' ', '')
        zone_leader, created = User.objects.get_or_create(
            username=zone_username,
            defaults={
                'email': f'{zone_username}@cfct.or.tz',
                'full_name': f'{zone_name} Leader',
                'role': 'zone_leader',
                'is_active': True,
                'is_approved': True,
                'church': zone_church,
                'password': make_password(f'{zone_username}123')
            }
        )
        print(f"   👤 Zone Leader: {zone_leader.username} (Password: {zone_username}123)")

        # Create regions for this zone
        for region_name in zone_info['regions']:
            region_code = f"CFCT-REG-{region_name.replace(' ', '').upper()[:10]}"
            region_church, created = Church.objects.get_or_create(
                code=region_code,
                defaults={
                    'name': region_name,
                    'church_type': 'region',
                    'parent_church': zone_church,
                    'is_active': True
                }
            )
            created_regions.append(region_church)
            print(f"   📍 Region: {region_church.name}")

            # Create regional leader
            region_username = region_name.lower().replace(' ', '').replace('/', '')
            regional_leader, created = User.objects.get_or_create(
                username=region_username,
                defaults={
                    'email': f'{region_username}@cfct.or.tz',
                    'full_name': f'{region_name} Leader',
                    'role': 'regional_leader',
                    'is_active': True,
                    'is_approved': True,
                    'church': region_church,
                    'password': make_password(f'{region_username}123')
                }
            )
            print(f"      👤 Regional Leader: {regional_leader.username} (Password: {region_username}123)")

            # Create districts for this region (if they exist in our data)
            if region_name in districts_data:
                for district_name in districts_data[region_name]:
                    district_code = f"CFCT-DIST-{district_name.replace(' ', '').replace('/', '').upper()[:10]}"
                    district_church, created = Church.objects.get_or_create(
                        code=district_code,
                        defaults={
                            'name': district_name,
                            'church_type': 'district',
                            'parent_church': region_church,
                            'is_active': True
                        }
                    )
                    created_districts.append(district_church)
                    print(f"         🏛️ District: {district_church.name}")

                    # Create district leader
                    district_username = district_name.lower().replace(' ', '').replace('/', '').replace('\'', '')
                    district_leader, created = User.objects.get_or_create(
                        username=district_username,
                        defaults={
                            'email': f'{district_username}@cfct.or.tz',
                            'full_name': f'{district_name} Leader',
                            'role': 'district_leader',
                            'is_active': True,
                            'is_approved': True,
                            'church': district_church,
                            'password': make_password(f'{district_username}123')
                        }
                    )
                    print(f"            👤 District Leader: {district_leader.username} (Password: {district_username}123)")

                    # Create sample local churches for each district (for demonstration)
                    for i in range(1, 4):  # 3 local churches per district
                        local_code = f"CFCT-LOC-{district_username}{i}"
                        local_church, created = Church.objects.get_or_create(
                            code=local_code,
                            defaults={
                                'name': f'{district_name} Local Church {i}',
                                'church_type': 'local',
                                'parent_church': district_church,
                                'is_active': True
                            }
                        )
                        print(f"               ⛪ Local Church: {local_church.name}")

                        # Create local leader
                        local_username = f"{district_username}local{i}"
                        local_leader, created = User.objects.get_or_create(
                            username=local_username,
                            defaults={
                                'email': f'{local_username}@cfct.or.tz',
                                'full_name': f'{district_name} Local Church {i} Leader',
                                'role': 'local_leader',
                                'is_active': True,
                                'is_approved': True,
                                'church': local_church,
                                'password': make_password(f'{local_username}123')
                            }
                        )
                        print(f"                  👤 Local Leader: {local_leader.username} (Password: {local_username}123)")

    print("
🎉 Seeding completed successfully!"    print(f"📊 Summary:")
    print(f"   • National: 1")
    print(f"   • Zones: {len(created_zones)}")
    print(f"   • Regions: {len(created_regions)}")
    print(f"   • Districts: {len(created_districts)}")
    print(f"   • Local Churches: {len(created_districts) * 3} (sample)")
    print("
🔐 Login Credentials:"    print("  National Admin:")
    print("    Username: admin")
    print("    Password: Admin@123")
    print("  Zone Leaders: [zone_name] (e.g., northernzone)")
    print("    Password: [zone_name]123")
    print("  Regional Leaders: [region_name] (e.g., arusharegion)")
    print("    Password: [region_name]123")
    print("  District Leaders: [district_name] (e.g., arushacity)")
    print("    Password: [district_name]123")
    print("  Local Leaders: [district_name]local[1-3]")
    print("    Password: [district_name]local[1-3]123")

if __name__ == '__main__':
    seed_data()