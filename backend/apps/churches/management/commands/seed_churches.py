from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.accounts.models import User
from apps.churches.models import Church


class Command(BaseCommand):
    help = 'Seed database with full Tanzania church hierarchy (zones, regions, districts)'

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

        # Full Tanzania hierarchy provided by user (zone -> region -> districts)
        hierarchy_data = {
            'Northern Zone': {
                'Arusha': ['Arusha_CC', 'Arumeru', 'Arusha', 'Karatu', 'Longido', 'Monduli', 'Ngorongoro'],
                'Kilimanjaro': ['Moshi_MC', 'Hai', 'Moshi', 'Mwanga', 'Rombo', 'Same', 'Siha'],
                'Manyara': ['Babati_TC', 'Babati', 'Hanang', 'Kiteto', 'Mbulu', 'Simanjiro'],
                'Tanga': ['Tanga_CC', 'Bumbuli', 'Handeni_MC', 'Handeni', 'Kilindi', 'Korogwe_TC', 'Korogwe', 'Lushoto', 'Muheza', 'Pangani', 'Mkinga'],
            },
            'Coastal Zone': {
                'Dar es Salaam': ['Ilala', 'Kinondoni', 'Kigamboni', 'Temeke', 'Ubungo'],
                'Pwani': ['Kibaha_TC', 'Bagamoyo', 'Kibaha', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji'],
                'Morogoro': ['Morogoro_MC', 'Gairo', 'Kilombero', 'Kilosa', 'Morogoro', 'Mvomero', 'Ulanga', 'Malinyi'],
            },
            'Lake Zone': {
                'Mwanza': ['Mwanza_CC', 'Ilemela', 'Kwimba', 'Magu', 'Misungwi', 'Nyamagana', 'Sengerema', 'Ukerewe'],
                'Mara': ['Musoma_MC', 'Bunda', 'Butiama', 'Musoma', 'Rorya', 'Serengeti', 'Tarime'],
                'Kagera': ['Bukoba_CC', 'Bukoba', 'Biharamulo', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara'],
                'Geita': ['Geita', 'Bukombe', 'Chato', 'Mbogwe', 'Nyanghwale'],
                'Simiyu': ['Bariadi_TC', 'Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
                'Shinyanga': ['Shinyanga_MC', 'Kahama_MC', 'Kahama', 'Kishapu', 'Shinyanga'],
            },
            'Central Zone': {
                'Dodoma': ['Dodoma_CC', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa'],
                'Singida': ['Singida_MC', 'Ikungi', 'Iramba', 'Manyoni', 'Mkalama', 'Singida'],
            },
            'Southern Highlands Zone': {
                'Mbeya': ['Mbeya_CC', 'Busokelo', 'Chunya', 'Kyela', 'Mbarali', 'Mbeya', 'Rungwe'],
                'Iringa': ['Iringa_MC', 'Iringa', 'Kilolo', 'Mafinga_TC', 'Mufindi'],
                'Njombe': ['Njombe_TC', 'Ludewa', 'Makambako_TC', 'Makete', 'Njombe', 'Wangingombe'],
                'Rukwa': ['Sumbawanga_MC', 'Kalambo', 'Nkasi', 'Sumbawanga'],
                'Songwe': ['Tunduma_TC', 'Ileje', 'Mbozi', 'Momba', 'Songwe'],
            },
            'Southern Zone': {
                'Lindi': ['Lindi_MC', 'Kilwa', 'Lindi', 'Liwale', 'Nachingwea', 'Ruangwa'],
                'Mtwara': ['Mtwara_MC', 'Masasi_TC', 'Masasi', 'Mtwara', 'Nanyumbu', 'Newala', 'Tandahimba'],
                'Ruvuma': ['Songea_MC', 'Madaba', 'Mbinga', 'Nyasa', 'Songea', 'Tunduru'],
            },
            'Western Zone': {
                'Kigoma': ['Kigoma_MC', 'Buhigwe', 'Kasulu', 'Kibondo', 'Kakonko', 'Kigoma', 'Uvinza'],
                'Tabora': ['Tabora_MC', 'Igunga', 'Kaliua', 'Nzega_TC', 'Sikonge', 'Tabora', 'Urambo'],
                'Katavi': ['Mpanda_MC', 'Mpanda', 'Mlele', 'Tanganyika'],
            },
        }

        created_zones = 0
        created_regions = 0
        created_districts = 0
        created_local_churches = 0

        zone_index = 1
        region_index = 1
        district_index = 1

        # Create zones and their hierarchies
        for zone_name, regions in hierarchy_data.items():
            zone_code = f"CFCT-ZONE-{zone_index:03d}"
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
            zone_index += 1

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
            for region_name, districts in regions.items():
                region_code = f"CFCT-REG-{region_index:03d}"
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
                region_index += 1

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
                for district_name in districts:
                    district_code = f"CFCT-DIST-{district_index:03d}"
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
                    district_index += 1

                    # Create district leader
                    district_username = district_name.lower().replace(' ', '').replace('/', '').replace("'", '').replace('_', '')
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
                        local_code = f"CFCT-LOC-{district_church.code}-{i}"
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
