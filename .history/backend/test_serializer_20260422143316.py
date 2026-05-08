#!/usr/bin/env python
"""Test the serializer output"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.members.models import MemberRegistration
from apps.members.serializers import MemberRegistrationSerializer
import json

print("=" * 80)
print("TESTING SERIALIZER OUTPUT")
print("=" * 80)

registrations = MemberRegistration.objects.filter(status='pending')[:1]

for reg in registrations:
    print(f"\nRegistration ID: {reg.id}")
    print(f"Raw personal_info: {reg.personal_info}")
    print(f"Raw guardian_info: {reg.guardian_info}")
    print(f"Raw spiritual_info: {reg.spiritual_info}")
    
    serializer = MemberRegistrationSerializer(reg)
    print("\nSerialized data:")
    print(json.dumps(serializer.data, indent=2, default=str))

print("\nDone!")
