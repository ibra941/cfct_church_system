#!/usr/bin/env python
"""Test the API response as a client would"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
import json

User = get_user_model()

# Get a leader user to make authenticated requests
leader = User.objects.filter(role__in=['national_leader', 'zone_leader', 'regional_leader']).first()

if not leader:
    print("No leader found, creating one...")
else:
    print(f"Using leader: {leader.username} ({leader.role})")
    
    # Create a test client and force authenticate
    client = Client()
    
    # Test the pending registrations endpoint
    print("\n" + "=" * 80)
    print("Testing GET /api/members/registrations/pending/")
    print("=" * 80)
    
    response = client.get('/api/members/registrations/pending/', HTTP_AUTHORIZATION=f'Bearer {leader.id}')
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        try:
            data = response.json()
            print("Response structure:")
            if isinstance(data, dict) and 'results' in data:
                print(f"  - count: {data.get('count')}")
                print(f"  - next: {data.get('next')}")
                print(f"  - previous: {data.get('previous')}")
                print(f"  - results: {len(data['results'])} items")
                if data['results']:
                    reg = data['results'][0]
                    print(f"\n  First result keys: {list(reg.keys())}")
                    print(f"  personal_info present: {'personal_info' in reg}")
                    print(f"  guardian_info present: {'guardian_info' in reg}")
                    print(f"  spiritual_info present: {'spiritual_info' in reg}")
                    print(f"\nFirst registration (full):")
                    print(json.dumps(reg, indent=2, default=str))
            else:
                print(f"Response: {json.dumps(data, indent=2, default=str)[:500]}")
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(f"Response text: {response.text[:500]}")
    else:
        print(f"Response: {response.text[:500]}")
