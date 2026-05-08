#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.members.models import MemberRegistration
import json

print("=" * 80)
print("CHECKING MEMBER REGISTRATIONS IN DATABASE")
print("=" * 80)

registrations = MemberRegistration.objects.all()
print(f"\nTotal registrations: {registrations.count()}\n")

for reg in registrations[:5]:  # Show first 5
    print(f"ID: {reg.id}")
    print(f"User: {reg.user.username} ({reg.user.full_name})")
    print(f"Status: {reg.status}")
    print(f"Church: {reg.church.name}")
    print(f"Personal Info: {json.dumps(reg.personal_info, indent=2)}")
    print(f"Guardian Info: {json.dumps(reg.guardian_info, indent=2)}")
    print(f"Spiritual Info: {json.dumps(reg.spiritual_info, indent=2)}")
    print("-" * 80)

print("\nDone!")
