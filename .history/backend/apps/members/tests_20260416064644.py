from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.churches.models import Church
from apps.members.models import MemberRegistration


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