import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.churches.models import Church

def add_church_hierarchy():
    print("=" * 60)
    print("ADDING CHURCH HIERARCHY (Zones -> Regions -> Districts)")
    print("=" * 60)
    
    # First, get or create National Church
    national, created = Church.objects.get_or_create(
        code='CFCT-NAT-001',
        defaults={
            'name': 'Christian Fellowship Church Tanzania',
            'church_type': 'national',
            'country': 'Tanzania',
            'is_active': True
        }
    )
    print(f"\n✅ National Church: {national.name}")
    
    # ============================================
    # ZONES (8 Zones)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING ZONES")
    print("=" * 60)
    
    zones = [
        {'name': 'Northern Zone', 'code': 'CFCT-ZONE-001'},
        {'name': 'Lake Zone', 'code': 'CFCT-ZONE-002'},
        {'name': 'Central Zone', 'code': 'CFCT-ZONE-003'},
        {'name': 'Eastern Zone', 'code': 'CFCT-ZONE-004'},
        {'name': 'Southern Highlands Zone', 'code': 'CFCT-ZONE-005'},
        {'name': 'Western Zone', 'code': 'CFCT-ZONE-006'},
        {'name': 'Southern Zone', 'code': 'CFCT-ZONE-007'},
        {'name': 'Zanzibar Zone', 'code': 'CFCT-ZONE-008'},
    ]
    
    zone_objects = {}
    for zone_data in zones:
        zone, created = Church.objects.get_or_create(
            code=zone_data['code'],
            defaults={
                'name': zone_data['name'],
                'church_type': 'zone',
                'parent_church': national,
                'is_active': True
            }
        )
        zone_objects[zone_data['name']] = zone
        print(f"  ✅ Zone: {zone.name}")
    
    # ============================================
    # REGIONS (31 Regions)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING REGIONS")
    print("=" * 60)
    
    regions = [
        # Northern Zone (4 regions)
        {'name': 'Arusha Region', 'code': 'CFCT-REG-001', 'zone': 'Northern Zone'},
        {'name': 'Kilimanjaro Region', 'code': 'CFCT-REG-002', 'zone': 'Northern Zone'},
        {'name': 'Tanga Region', 'code': 'CFCT-REG-003', 'zone': 'Northern Zone'},
        {'name': 'Manyara Region', 'code': 'CFCT-REG-004', 'zone': 'Northern Zone'},
        
        # Lake Zone (5 regions)
        {'name': 'Mwanza Region', 'code': 'CFCT-REG-005', 'zone': 'Lake Zone'},
        {'name': 'Geita Region', 'code': 'CFCT-REG-006', 'zone': 'Lake Zone'},
        {'name': 'Simiyu Region', 'code': 'CFCT-REG-007', 'zone': 'Lake Zone'},
        {'name': 'Mara Region', 'code': 'CFCT-REG-008', 'zone': 'Lake Zone'},
        {'name': 'Kagera Region', 'code': 'CFCT-REG-009', 'zone': 'Lake Zone'},
        
        # Central Zone (2 regions)
        {'name': 'Dodoma Region', 'code': 'CFCT-REG-010', 'zone': 'Central Zone'},
        {'name': 'Singida Region', 'code': 'CFCT-REG-011', 'zone': 'Central Zone'},
        
        # Eastern Zone (3 regions)
        {'name': 'Dar es Salaam Region', 'code': 'CFCT-REG-012', 'zone': 'Eastern Zone'},
        {'name': 'Pwani Region', 'code': 'CFCT-REG-013', 'zone': 'Eastern Zone'},
        {'name': 'Morogoro Region', 'code': 'CFCT-REG-014', 'zone': 'Eastern Zone'},
        
        # Southern Highlands Zone (6 regions)
        {'name': 'Mbeya Region', 'code': 'CFCT-REG-015', 'zone': 'Southern Highlands Zone'},
        {'name': 'Iringa Region', 'code': 'CFCT-REG-016', 'zone': 'Southern Highlands Zone'},
        {'name': 'Njombe Region', 'code': 'CFCT-REG-017', 'zone': 'Southern Highlands Zone'},
        {'name': 'Songwe Region', 'code': 'CFCT-REG-018', 'zone': 'Southern Highlands Zone'},
        {'name': 'Rukwa Region', 'code': 'CFCT-REG-019', 'zone': 'Southern Highlands Zone'},
        {'name': 'Katavi Region', 'code': 'CFCT-REG-020', 'zone': 'Southern Highlands Zone'},
        
        # Western Zone (2 regions)
        {'name': 'Tabora Region', 'code': 'CFCT-REG-021', 'zone': 'Western Zone'},
        {'name': 'Kigoma Region', 'code': 'CFCT-REG-022', 'zone': 'Western Zone'},
        
        # Southern Zone (3 regions)
        {'name': 'Ruvuma Region', 'code': 'CFCT-REG-023', 'zone': 'Southern Zone'},
        {'name': 'Lindi Region', 'code': 'CFCT-REG-024', 'zone': 'Southern Zone'},
        {'name': 'Mtwara Region', 'code': 'CFCT-REG-025', 'zone': 'Southern Zone'},
        
        # Zanzibar Zone (5 regions)
        {'name': 'Unguja North Region', 'code': 'CFCT-REG-026', 'zone': 'Zanzibar Zone'},
        {'name': 'Unguja South Region', 'code': 'CFCT-REG-027', 'zone': 'Zanzibar Zone'},
        {'name': 'Urban/West Region', 'code': 'CFCT-REG-028', 'zone': 'Zanzibar Zone'},
        {'name': 'Pemba North Region', 'code': 'CFCT-REG-029', 'zone': 'Zanzibar Zone'},
        {'name': 'Pemba South Region', 'code': 'CFCT-REG-030', 'zone': 'Zanzibar Zone'},
    ]
    
    region_objects = {}
    for region_data in regions:
        zone = zone_objects.get(region_data['zone'])
        region, created = Church.objects.get_or_create(
            code=region_data['code'],
            defaults={
                'name': region_data['name'],
                'church_type': 'region',
                'parent_church': zone,
                'is_active': True
            }
        )
        region_objects[region_data['name']] = region
        print(f"  ✅ Region: {region.name} (Zone: {zone.name})")
    
    # ============================================
    # DISTRICTS (All districts)
    # ============================================
    print("\n" + "=" * 60)
    print("CREATING DISTRICTS")
    print("=" * 60)
    
    districts = [
        # Arusha Region districts
        ('Arusha Region', ['Arusha City', 'Arusha District', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro']),
        
        # Dar es Salaam Region districts
        ('Dar es Salaam Region', ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni']),
        
        # Dodoma Region districts
        ('Dodoma Region', ['Dodoma City', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa']),
        
        # Geita Region districts
        ('Geita Region', ['Geita', 'Bukombe', 'Chato', 'Mbogwe', 'Nyang\'hwale']),
        
        # Iringa Region districts
        ('Iringa Region', ['Iringa Municipal', 'Iringa District', 'Kilolo', 'Mufindi']),
        
        # Kagera Region districts
        ('Kagera Region', ['Bukoba Municipal', 'Bukoba District', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara']),
        
        # Katavi Region districts
        ('Katavi Region', ['Mpanda Municipal', 'Mpanda District', 'Mlele']),
        
        # Kigoma Region districts
        ('Kigoma Region', ['Kigoma-Ujiji Municipal', 'Kigoma District', 'Kasulu Town', 'Kasulu District', 'Kibondo', 'Kakonko', 'Uvinza']),
        
        # Kilimanjaro Region districts
        ('Kilimanjaro Region', ['Moshi Municipal', 'Moshi District', 'Hai', 'Siha', 'Mwanga', 'Rombo', 'Same']),
        
        # Lindi Region districts
        ('Lindi Region', ['Lindi Municipal', 'Lindi District', 'Kilwa', 'Liwale', 'Nachingwea', 'Ruangwa']),
        
        # Manyara Region districts
        ('Manyara Region', ['Babati Town', 'Babati District', 'Hanang', 'Kiteto', 'Mbulu', 'Simanjiro']),
        
        # Mara Region districts
        ('Mara Region', ['Musoma Municipal', 'Musoma District', 'Butiama', 'Rorya', 'Tarime', 'Serengeti', 'Bunda']),
        
        # Mbeya Region districts
        ('Mbeya Region', ['Mbeya City', 'Mbeya District', 'Chunya', 'Kyela', 'Mbarali', 'Rungwe', 'Busokelo']),
        
        # Morogoro Region districts
        ('Morogoro Region', ['Morogoro Municipal', 'Morogoro District', 'Gairo', 'Kilombero', 'Kilosa', 'Mvomero', 'Ulanga', 'Malinyi']),
        
        # Mtwara Region districts
        ('Mtwara Region', ['Mtwara Municipal', 'Mtwara District', 'Masasi Town', 'Masasi District', 'Nanyumbu', 'Newala', 'Tandahimba']),
        
        # Mwanza Region districts
        ('Mwanza Region', ['Nyamagana', 'Ilemela', 'Magu', 'Misungwi', 'Sengerema', 'Kwimba', 'Ukerewe']),
        
        # Njombe Region districts
        ('Njombe Region', ['Njombe Town', 'Njombe District', 'Ludewa', 'Makambako', 'Wanging\'ombe']),
        
        # Pwani Region districts
        ('Pwani Region', ['Kibaha Town', 'Kibaha District', 'Bagamoyo', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji']),
        
        # Rukwa Region districts
        ('Rukwa Region', ['Sumbawanga Municipal', 'Sumbawanga District', 'Kalambo', 'Nkasi']),
        
        # Ruvuma Region districts
        ('Ruvuma Region', ['Songea Municipal', 'Songea District', 'Mbinga', 'Nyasa', 'Namtumbo', 'Tunduru']),
        
        # Shinyanga Region districts
        ('Shinyanga Region', ['Shinyanga Municipal', 'Shinyanga District', 'Kahama Town', 'Kahama District', 'Kishapu']),
        
        # Simiyu Region districts
        ('Simiyu Region', ['Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu']),
        
        # Singida Region districts
        ('Singida Region', ['Singida Municipal', 'Singida District', 'Ikungi', 'Iramba', 'Manyoni', 'Mkalama']),
        
        # Songwe Region districts
        ('Songwe Region', ['Mbozi', 'Ileje', 'Momba', 'Songwe', 'Tunduma']),
        
        # Tabora Region districts
        ('Tabora Region', ['Tabora Municipal', 'Tabora District', 'Igunga', 'Kaliua', 'Nzega Town', 'Nzega District', 'Sikonge', 'Urambo']),
        
        # Tanga Region districts
        ('Tanga Region', ['Tanga City', 'Muheza', 'Pangani', 'Korogwe Town', 'Korogwe District', 'Handeni Town', 'Handeni District', 'Kilindi', 'Lushoto', 'Mkinga']),
        
        # Zanzibar Regions districts
        ('Unguja North Region', ['Kaskazini A', 'Kaskazini B']),
        ('Unguja South Region', ['Kati', 'Kusini']),
        ('Urban/West Region', ['Magharibi A', 'Magharibi B']),
        ('Pemba North Region', ['Micheweni', 'Wete']),
        ('Pemba South Region', ['Chake Chake', 'Mkoani']),
    ]
    
    district_counter = 1
    for region_name, district_list in districts:
        region = region_objects.get(region_name)
        if region:
            for district_name in district_list:
                district_code = f'CFCT-DIST-{district_counter:03d}'
                district, created = Church.objects.get_or_create(
                    code=district_code,
                    defaults={
                        'name': district_name,
                        'church_type': 'district',
                        'parent_church': region,
                        'is_active': True
                    }
                )
                district_counter += 1
                if created:
                    print(f"  ✅ District: {district_name} (Region: {region_name})")
    
    # ============================================
    # SUMMARY
    # ============================================
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total Zones: {Church.objects.filter(church_type='zone').count()}")
    print(f"Total Regions: {Church.objects.filter(church_type='region').count()}")
    print(f"Total Districts: {Church.objects.filter(church_type='district').count()}")
    print(f"Total Churches: {Church.objects.count()}")
    print("\n✅ Church hierarchy added successfully!")

if __name__ == '__main__':
    add_church_hierarchy()