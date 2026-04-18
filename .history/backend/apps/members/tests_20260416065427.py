from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import User
from apps.churches.models import Church
from apps.members.models import MemberRegistration
from apps.prayers.models import PrayerRequest


class MembersApiTests(APITestCase):
    def setUp(self):
        self.church = Church.objects.create(name='Local Church A', church_type='local')
        self.leader = User.objects.create_user(
            username='leader',
            email='leader@test.com',
            password='testpass123',
            role='local_leader',
            church=self.church,
            is_active=True,
            is_approved=True,
        )
        self.client.force_authenticate(user=self.leader)

    def _create_pending_registration(self, username, email, phone='0700000000'):
        member = User.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            role='local_member',
            church=self.church,
            is_active=False,
            is_approved=False,
            full_name=username,
            phone=phone,
        )
        return MemberRegistration.objects.create(
            user=member,
            church=self.church,
            personal_info={'full_name': username, 'email': email, 'phone': phone},
            guardian_info={},
            spiritual_info={},
            status='pending',
        )

    def test_duplicate_members_endpoint_detects_phone_duplicates(self):
        User.objects.create_user(
            username='m1',
            email='dup1@test.com',
            password='testpass123',
            role='local_member',
            church=self.church,
            is_active=True,
            is_approved=True,
            phone='0777777777',
        )
        User.objects.create_user(
            username='m2',
            email='dup2@test.com',
            password='testpass123',
            role='local_member',
            church=self.church,
            is_active=True,
            is_approved=True,
            phone='0777777777',
        )

        response = self.client.get('/api/members/registrations/duplicates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['total_duplicate_phone_groups'], 1)

    def test_bulk_approve_updates_registration_and_user(self):
        reg1 = self._create_pending_registration('pending1', 'p1@test.com')
        reg2 = self._create_pending_registration('pending2', 'p2@test.com', phone='0733333333')

        response = self.client.post(
            '/api/members/registrations/bulk-action/',
            {
                'registration_ids': [reg1.id, reg2.id],
                'action': 'approve',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['processed_count'], 2)

        reg1.refresh_from_db()
        reg2.refresh_from_db()
        self.assertEqual(reg1.status, 'approved')
        self.assertEqual(reg2.status, 'approved')
        self.assertTrue(reg1.user.is_active)
        self.assertTrue(reg2.user.is_active)

    def test_member_csv_import_creates_pending_registration(self):
        csv_content = "full_name,email,phone,neighborhood\nJohn Doe,john.doe@test.com,0755555555,Kijitonyama\n"
        uploaded = SimpleUploadedFile('members.csv', csv_content.encode('utf-8'), content_type='text/csv')

        response = self.client.post(
            '/api/members/registrations/import/csv/',
            {'file': uploaded},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created_count'], 1)
        self.assertTrue(User.objects.filter(email='john.doe@test.com').exists())
        created_user = User.objects.get(email='john.doe@test.com')
        self.assertTrue(MemberRegistration.objects.filter(user=created_user, status='pending').exists())

    def test_merge_duplicate_members_moves_prayers_and_deactivates_duplicate(self):
        primary = User.objects.create_user(
            username='primary1',
            email='primary1@test.com',
            password='testpass123',
            role='local_member',
            church=self.church,
            is_active=True,
            is_approved=True,
            phone='0781111111',
        )
        duplicate = User.objects.create_user(
            username='duplicate1',
            email='duplicate1@test.com',
            password='testpass123',
            role='local_member',
            church=self.church,
            is_active=True,
            is_approved=True,
            phone='0781111111',
        )
        PrayerRequest.objects.create(member=duplicate, request='Please pray', is_public=True)

        response = self.client.post(
            '/api/members/registrations/merge-duplicates/',
            {
                'primary_user_id': primary.id,
                'duplicate_user_id': duplicate.id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        duplicate.refresh_from_db()
        self.assertFalse(duplicate.is_active)
        self.assertIsNone(duplicate.email)
        self.assertTrue(duplicate.username.startswith(f'merged_{duplicate.id}_'))
        self.assertEqual(PrayerRequest.objects.filter(member=primary).count(), 1)