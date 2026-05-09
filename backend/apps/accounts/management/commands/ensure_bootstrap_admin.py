import os

from django.core.management.base import BaseCommand

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Create or update a bootstrap admin user from environment variables."

    def handle(self, *args, **options):
        username = (os.getenv("BOOTSTRAP_ADMIN_USERNAME") or "").strip()
        password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD") or ""
        email = (os.getenv("BOOTSTRAP_ADMIN_EMAIL") or "").strip() or None
        full_name = (os.getenv("BOOTSTRAP_ADMIN_FULL_NAME") or "").strip() or "Bootstrap Admin"

        if not username or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Skipping bootstrap admin creation: set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD."
                )
            )
            return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "full_name": full_name,
                "role": "national_leader",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "is_approved": True,
            },
        )

        # Ensure the account remains usable for login in production.
        user.email = email
        user.full_name = full_name
        user.role = "national_leader"
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.is_approved = True
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created bootstrap admin user '{username}'."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated bootstrap admin user '{username}'."))
