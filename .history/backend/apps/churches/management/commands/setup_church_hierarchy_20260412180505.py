"""Load the real Tanzania CFCT hierarchy into the churches table."""

from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from apps.churches.models import Church


ZONE_REGION_DISTRICT_DATA = {
    "Northern Zone": {
        "Arusha Region": [
            "Arusha City", "Arusha District", "Karatu", "Longido", "Meru", "Monduli", "Ngorongoro",
        ],
        "Kilimanjaro Region": [
            "Moshi Municipal", "Moshi District", "Hai", "Siha", "Mwanga", "Rombo", "Same",
        ],
        "Tanga Region": [
            "Tanga City", "Muheza", "Pangani", "Korogwe Town", "Korogwe District", "Handeni Town",
            "Handeni District", "Kilindi", "Lushoto", "Mkinga",
        ],
        "Manyara Region": [
            "Babati Town", "Babati District", "Hanang", "Kiteto", "Mbulu", "Simanjiro",
        ],
    },
    "Lake Zone": {
        "Mwanza Region": [
            "Nyamagana", "Ilemela", "Magu", "Misungwi", "Sengerema", "Kwimba", "Ukerewe",
        ],
        "Geita Region": [
            "Geita", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale",
        ],
        "Simiyu Region": [
            "Bariadi", "Busega", "Itilima", "Maswa", "Meatu",
        ],
        "Mara Region": [
            "Musoma Municipal", "Musoma District", "Butiama", "Rorya", "Tarime", "Serengeti", "Bunda",
        ],
        "Kagera Region": [
            "Bukoba Municipal", "Bukoba District", "Karagwe", "Kyerwa", "Missenyi", "Muleba", "Ngara",
        ],
        "Shinyanga Region": [
            "Shinyanga Municipal", "Shinyanga District", "Kahama Town", "Kahama District", "Kishapu",
        ],
    },
    "Central Zone": {
        "Dodoma Region": [
            "Dodoma City", "Bahi", "Chamwino", "Chemba", "Kondoa", "Kongwa", "Mpwapwa",
        ],
        "Singida Region": [
            "Singida Municipal", "Singida District", "Ikungi", "Iramba", "Manyoni", "Mkalama",
        ],
    },
    "Eastern Zone": {
        "Dar es Salaam Region": [
            "Ilala", "Kinondoni", "Temeke", "Ubungo", "Kigamboni",
        ],
        "Pwani Region": [
            "Kibaha Town", "Kibaha District", "Bagamoyo", "Kisarawe", "Mafia", "Mkuranga", "Rufiji",
        ],
        "Morogoro Region": [
            "Morogoro Municipal", "Morogoro District", "Gairo", "Kilombero", "Kilosa", "Mvomero", "Ulanga", "Malinyi",
        ],
    },
    "Southern Highlands Zone": {
        "Mbeya Region": [
            "Mbeya City", "Mbeya District", "Chunya", "Kyela", "Mbarali", "Rungwe", "Busokelo",
        ],
        "Iringa Region": [
            "Iringa Municipal", "Iringa District", "Kilolo", "Mufindi",
        ],
        "Njombe Region": [
            "Njombe Town", "Njombe District", "Ludewa", "Makambako", "Wanging'ombe",
        ],
        "Songwe Region": [
            "Mbozi", "Ileje", "Momba", "Songwe", "Tunduma",
        ],
        "Rukwa Region": [
            "Sumbawanga Municipal", "Sumbawanga District", "Kalambo", "Nkasi",
        ],
        "Katavi Region": [
            "Mpanda Municipal", "Mpanda District", "Mlele",
        ],
    },
    "Western Zone": {
        "Tabora Region": [
            "Tabora Municipal", "Tabora District", "Igunga", "Kaliua", "Nzega Town", "Nzega District", "Sikonge", "Urambo",
        ],
        "Kigoma Region": [
            "Kigoma-Ujiji Municipal", "Kigoma District", "Kasulu Town", "Kasulu District", "Kibondo", "Kakonko", "Uvinza",
        ],
    },
    "Southern Zone": {
        "Ruvuma Region": [
            "Songea Municipal", "Songea District", "Mbinga", "Nyasa", "Namtumbo", "Tunduru",
        ],
        "Lindi Region": [
            "Lindi Municipal", "Lindi District", "Kilwa", "Liwale", "Nachingwea", "Ruangwa",
        ],
        "Mtwara Region": [
            "Mtwara Municipal", "Mtwara District", "Masasi Town", "Masasi District", "Nanyumbu", "Newala", "Tandahimba",
        ],
    },
    "Zanzibar Zone": {
        "Unguja North Region": ["Kaskazini A", "Kaskazini B"],
        "Unguja South Region": ["Kati", "Kusini"],
        "Urban/West Region": ["Magharibi A", "Magharibi B"],
        "Pemba North Region": ["Micheweni", "Wete"],
        "Pemba South Region": ["Chake Chake", "Mkoani"],
    },
}


def make_code(prefix, name):
    slug = slugify(name).replace("-", "_").upper()
    return f"{prefix}_{slug}"[:50]


class Command(BaseCommand):
    help = "Load the Tanzania hierarchy: zone -> region -> district -> local church"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing zones, regions, districts, and local churches before loading the Tanzania hierarchy.",
        )

    def handle(self, *args, **options):
        national = Church.objects.filter(church_type="national").first()
        if not national:
            raise CommandError("No national church found. Create the national church first.")

        if options["clear"]:
            deleted, _ = Church.objects.filter(
                church_type__in=["zone", "region", "district", "local"]
            ).delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing non-national church records."))

        zone_count = 0
        region_count = 0
        district_count = 0
        local_count = 0

        for zone_name, regions in ZONE_REGION_DISTRICT_DATA.items():
            zone, created = Church.objects.get_or_create(
                name=zone_name,
                church_type="zone",
                defaults={
                    "code": make_code("ZN", zone_name),
                    "parent_church": national,
                    "country": "Tanzania",
                    "is_active": True,
                },
            )
            if zone.parent_church_id != national.id:
                zone.parent_church = national
                zone.save(update_fields=["parent_church"])
            if created:
                zone_count += 1

            for region_name, districts in regions.items():
                region, created = Church.objects.get_or_create(
                    name=region_name,
                    church_type="region",
                    defaults={
                        "code": make_code("RG", region_name),
                        "parent_church": zone,
                        "country": "Tanzania",
                        "is_active": True,
                        "region": region_name,
                    },
                )
                region_updates = []
                if region.parent_church_id != zone.id:
                    region.parent_church = zone
                    region_updates.append("parent_church")
                if region.region != region_name:
                    region.region = region_name
                    region_updates.append("region")
                if region_updates:
                    region.save(update_fields=region_updates)
                if created:
                    region_count += 1

                for district_name in districts:
                    district, created = Church.objects.get_or_create(
                        name=district_name,
                        church_type="district",
                        defaults={
                            "code": make_code("DT", f"{region_name}_{district_name}"),
                            "parent_church": region,
                            "country": "Tanzania",
                            "is_active": True,
                            "region": region_name,
                            "city": district_name,
                        },
                    )
                    district_updates = []
                    if district.parent_church_id != region.id:
                        district.parent_church = region
                        district_updates.append("parent_church")
                    if district.region != region_name:
                        district.region = region_name
                        district_updates.append("region")
                    if not district.city:
                        district.city = district_name
                        district_updates.append("city")
                    if district_updates:
                        district.save(update_fields=district_updates)
                    if created:
                        district_count += 1

                    local_name = f"{district_name} CFCT"
                    local, created = Church.objects.get_or_create(
                        name=local_name,
                        church_type="local",
                        defaults={
                            "code": make_code("LC", f"{region_name}_{district_name}"),
                            "parent_church": district,
                            "country": "Tanzania",
                            "is_active": True,
                            "region": region_name,
                            "city": district_name,
                        },
                    )
                    local_updates = []
                    if local.parent_church_id != district.id:
                        local.parent_church = district
                        local_updates.append("parent_church")
                    if local.region != region_name:
                        local.region = region_name
                        local_updates.append("region")
                    if not local.city:
                        local.city = district_name
                        local_updates.append("city")
                    if local_updates:
                        local.save(update_fields=local_updates)
                    if created:
                        local_count += 1

        total_regions = sum(len(regions) for regions in ZONE_REGION_DISTRICT_DATA.values())
        total_districts = sum(len(districts) for regions in ZONE_REGION_DISTRICT_DATA.values() for districts in regions.values())

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Tanzania hierarchy load complete."))
        self.stdout.write(f"Zones created: {zone_count} / {len(ZONE_REGION_DISTRICT_DATA)}")
        self.stdout.write(f"Regions created: {region_count} / {total_regions}")
        self.stdout.write(f"Districts created: {district_count} / {total_districts}")
        self.stdout.write(f"Local churches created: {local_count} / {total_districts}")
        self.stdout.write("Assumption applied: Shinyanga Region has been grouped under Lake Zone because it was listed in the districts section but omitted from the zone summary.")
