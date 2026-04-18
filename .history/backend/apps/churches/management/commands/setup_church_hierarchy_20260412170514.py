"""
Management command: setup_church_hierarchy

Creates the full National → Zone → Region → District hierarchy under the
existing national church so that:
  - The admin Add User cascade dropdowns have data to show
  - The dashboards (National, Zone, Regional, District) have data to display

Usage:
    python manage.py setup_church_hierarchy
    python manage.py setup_church_hierarchy --clear   # remove existing zones/regions/districts first

After running, log in to the admin and edit church names/codes as required.
"""

from django.core.management.base import BaseCommand, CommandError
from apps.churches.models import Church


# ---------------------------------------------------------------------------
# Default CFCT Tanzania hierarchy scaffold
# Edit these lists to match the real structure before running
# ---------------------------------------------------------------------------
ZONES = [
    {"name": "Zone A - Northern", "code": "ZA-NORTH"},
    {"name": "Zone B - Southern", "code": "ZB-SOUTH"},
    {"name": "Zone C - Eastern",  "code": "ZC-EAST"},
    {"name": "Zone D - Western",  "code": "ZD-WEST"},
    {"name": "Zone E - Central",  "code": "ZE-CENT"},
]

REGIONS_PER_ZONE = [
    {"name": "Region 1", "code_suffix": "R1"},
    {"name": "Region 2", "code_suffix": "R2"},
]

DISTRICTS_PER_REGION = [
    {"name": "District 1", "code_suffix": "D1"},
    {"name": "District 2", "code_suffix": "D2"},
]


class Command(BaseCommand):
    help = "Set up the default church hierarchy: Zone → Region → District"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing zones, regions, and districts before creating",
        )
        parser.add_argument(
            "--link-orphans",
            action="store_true",
            help="Link local churches that have no parent to the first district",
        )

    def handle(self, *args, **options):
        # ── 1. Get the national church ──────────────────────────────────────
        national = Church.objects.filter(church_type="national").first()
        if not national:
            raise CommandError(
                "No national church found. Please create one in the admin first."
            )
        self.stdout.write(f"National church: {national.name} (id={national.id})")

        # ── 2. Optional clear ───────────────────────────────────────────────
        if options["clear"]:
            deleted, _ = Church.objects.filter(
                church_type__in=["zone", "region", "district"]
            ).delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {deleted} existing zone/region/district records.")
            )

        # ── 3. Create zones ─────────────────────────────────────────────────
        created_zones = []
        for z_def in ZONES:
            zone, created = Church.objects.get_or_create(
                name=z_def["name"],
                church_type="zone",
                defaults={
                    "code": z_def["code"],
                    "parent_church": national,
                    "country": "Tanzania",
                    "is_active": True,
                },
            )
            if not created and zone.parent_church is None:
                zone.parent_church = national
                zone.save()
            action = "created" if created else "exists"
            self.stdout.write(f"  Zone [{action}]: {zone.name} (id={zone.id})")
            created_zones.append(zone)

        # ── 4. Create regions under each zone ───────────────────────────────
        created_regions = []
        for zone in created_zones:
            for r_def in REGIONS_PER_ZONE:
                r_name = f"{r_def['name']} - {zone.name}"
                r_code = f"{zone.code}-{r_def['code_suffix']}"
                region, created = Church.objects.get_or_create(
                    name=r_name,
                    church_type="region",
                    defaults={
                        "code": r_code,
                        "parent_church": zone,
                        "country": "Tanzania",
                        "is_active": True,
                    },
                )
                if not created and region.parent_church is None:
                    region.parent_church = zone
                    region.save()
                action = "created" if created else "exists"
                self.stdout.write(f"    Region [{action}]: {region.name} (id={region.id})")
                created_regions.append(region)

        # ── 5. Create districts under each region ───────────────────────────
        created_districts = []
        for region in created_regions:
            for d_def in DISTRICTS_PER_REGION:
                d_name = f"{d_def['name']} - {region.name}"
                d_code = f"{region.code}-{d_def['code_suffix']}"
                district, created = Church.objects.get_or_create(
                    name=d_name,
                    church_type="district",
                    defaults={
                        "code": d_code,
                        "parent_church": region,
                        "country": "Tanzania",
                        "is_active": True,
                    },
                )
                if not created and district.parent_church is None:
                    district.parent_church = region
                    district.save()
                action = "created" if created else "exists"
                self.stdout.write(f"      District [{action}]: {district.name} (id={district.id})")
                created_districts.append(district)

        # ── 6. Optionally link orphan local churches ─────────────────────────
        if options["link_orphans"] and created_districts:
            first_district = created_districts[0]
            orphans = Church.objects.filter(church_type="local", parent_church__isnull=True)
            count = orphans.count()
            if count:
                orphans.update(parent_church=first_district)
                self.stdout.write(
                    self.style.WARNING(
                        f"Linked {count} orphan local church(es) to {first_district.name}."
                    )
                )

        # ── Summary ──────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {len(ZONES)} zone(s), "
            f"{len(REGIONS_PER_ZONE) * len(ZONES)} region(s), "
            f"{len(DISTRICTS_PER_REGION) * len(REGIONS_PER_ZONE) * len(ZONES)} district(s)."
        ))
        self.stdout.write(
            "  Next: Log into admin and rename these placeholders "
            "to match your real church structure."
        )
