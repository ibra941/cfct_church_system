from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.accounts.models import User
from apps.churches.models import Church


class Command(BaseCommand):
    help = 'Seed database with Tanzanian church hierarchy'

    def handle(self, *args, **options):
        self.stdout.write("🌍 Seeding Tanzanian Church Hierarchy...")

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
        national_church.name = 'Christian Fellowship Church Tanzania'
        national_church.church_type = 'national'
        national_church.country = 'Tanzania'
        national_church.is_active = True
        national_church.parent_church = None
        national_church.save(update_fields=['name', 'church_type', 'country', 'is_active', 'parent_church'])
        if created:
            self.stdout.write(self.style.SUCCESS(f"✅ National church: {national_church.name}"))

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
        if created:
            self.stdout.write(self.style.SUCCESS(f"✅ National Leader: {superuser.username}"))

        # Define complete Tanzanian hierarchy
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
                'regions': ['Mbeya Region', 'Iringa Region', 'Njombe Region']
            },
            'Western Zone': {
                'regions': ['Tabora Region', 'Kigoma Region']
            },
            'Southern Zone': {
                'regions': ['Ruvuma Region', 'Lindi Region', 'Mtwara Region']
            }
        }

        districts_data = {
            'Arusha Region': ['Arusha City', 'Arusha District'],
            'Kilimanjaro Region': ['Moshi Municipal', 'Moshi District'],
            'Tanga Region': ['Tanga City', 'Muheza'],
            'Manyara Region': ['Babati Town', 'Babati District'],
            'Mwanza Region': ['Nyamagana', 'Ilemela'],
            'Geita Region': ['Geita', 'Bukombe'],
            'Simiyu Region': ['Bariadi', 'Busega'],
            'Mara Region': ['Musoma Municipal', 'Musoma District'],
            'Kagera Region': ['Bukoba Municipal', 'Bukoba District'],
            'Dodoma Region': ['Dodoma City', 'Bahi'],
            'Singida Region': ['Singida Municipal', 'Singida District'],
            'Dar es Salaam Region': ['Ilala', 'Kinondoni'],
            'Pwani Region': ['Kibaha Town', 'Bagamoyo'],
            'Morogoro Region': ['Morogoro Municipal', 'Morogoro District'],
            'Mbeya Region': ['Mbeya City', 'Mbeya District'],
            'Iringa Region': ['Iringa Municipal', 'Iringa District'],
            'Njombe Region': ['Njombe Town', 'Njombe District'],
            'Ruvuma Region': ['Songea Municipal', 'Songea District'],
            'Lindi Region': ['Lindi Municipal', 'Lindi District'],
            'Mtwara Region': ['Mtwara Municipal', 'Mtwara District'],
            'Tabora Region': ['Tabora Municipal', 'Tabora District'],
            'Kigoma Region': ['Kigoma Municipal', 'Kigoma District'],
        }

        created_zones = 0
        created_regions = 0
        created_districts = 0
        created_local_churches = 0

        # Create zones and their hierarchies
        for zone_name, zone_info in zones_data.items():
            zone_code = f"CFCT-ZONE-{zone_name.replace(' ', '').upper()[:10]}"
            zone_church, z_created = Church.objects.get_or_create(
                code=zone_code,
                defaults={
                    'name': zone_name,
                    'church_type': 'zone',
                    'parent_church': national_church,
                    'is_active': True
                }
            )
            zone_church.name = zone_name
            zone_church.church_type = 'zone'
            zone_church.parent_church = national_church
            zone_church.is_active = True
            zone_church.save(update_fields=['name', 'church_type', 'parent_church', 'is_active'])
            if z_created:
                created_zones += 1
                self.stdout.write(f"✅ Zone: {zone_church.name}")

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

            # Create regions for this zone
            for region_name in zone_info['regions']:
                region_code = f"CFCT-REG-{region_name.replace(' ', '').upper()[:10]}"
                region_church, r_created = Church.objects.get_or_create(
                    code=region_code,
                    defaults={
                        'name': region_name,
                        'church_type': 'region',
                        'parent_church': zone_church,
                        'is_active': True
                    }
                )
                region_church.name = region_name
                region_church.church_type = 'region'
                region_church.parent_church = zone_church
                region_church.is_active = True
                region_church.save(update_fields=['name', 'church_type', 'parent_church', 'is_active'])
                if r_created:
                    created_regions += 1
                    self.stdout.write(f"   📍 Region: {region_church.name}")

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

                # Create districts for this region
                if region_name in districts_data:
                    for district_name in districts_data[region_name]:
                        district_code = f"CFCT-DIST-{district_name.replace(' ', '').upper()[:10]}"
                        district_church, d_created = Church.objects.get_or_create(
                            code=district_code,
                            defaults={
                                'name': district_name,
                                'church_type': 'district',
                                'parent_church': region_church,
                                'is_active': True
                            }
                        )
                        district_church.name = district_name
                        district_church.church_type = 'district'
                        district_church.parent_church = region_church
                        district_church.is_active = True
                        district_church.save(update_fields=['name', 'church_type', 'parent_church', 'is_active'])
                        if d_created:
                            created_districts += 1
                            self.stdout.write(f"      🏛️ District: {district_church.name}")

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

                        # Create 2 sample local churches per district
                        for i in range(1, 3):
                            local_code = f"CFCT-LOC-{district_username}{i}"
                            local_church, l_created = Church.objects.get_or_create(
                                code=local_code,
                                defaults={
                                    'name': f'{district_name} Church {i}',
                                    'church_type': 'local',
                                    'parent_church': district_church,
                                    'is_active': True
                                }
                            )
                            local_church.name = f'{district_name} Church {i}'
                            local_church.church_type = 'local'
                            local_church.parent_church = district_church
                            local_church.is_active = True
                            local_church.save(update_fields=['name', 'church_type', 'parent_church', 'is_active'])
                            if l_created:
                                created_local_churches += 1

                            # Create local leader
                            local_username = f'{district_username}local{i}'
                            local_leader, created = User.objects.get_or_create(
                                username=local_username,
                                defaults={
                                    'email': f'{local_username}@cfct.or.tz',
                                    'full_name': f'{district_name} Church {i} Leader',
                                    'role': 'local_leader',
                                    'is_active': True,
                                    'is_approved': True,
                                    'church': local_church,
                                    'password': make_password(f'{local_username}123')
                                }
                            )

        self.stdout.write(self.style.SUCCESS("\n🎉 Seeding completed successfully!"))
        self.stdout.write(
            f"📊 Created this run: {created_zones} zones, {created_regions} regions, {created_districts} districts, {created_local_churches} local churches"
        )
        self.stdout.write(
            f"📊 Totals in DB: {Church.objects.filter(church_type='zone').count()} zones, "
            f"{Church.objects.filter(church_type='region').count()} regions, "
            f"{Church.objects.filter(church_type='district').count()} districts, "
            f"{Church.objects.filter(church_type='local').count()} local churches"
        )
