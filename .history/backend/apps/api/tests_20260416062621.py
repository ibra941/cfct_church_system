from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.churches.models import Church
from apps.notifications.models import Notification
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer


class CoreApiTests(APITestCase):
    def setUp(self):
        self.zone = Church.objects.create(name='Central Zone', church_type='zone')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            church=self.zone,
            role='zone_leader',
            is_active=True,
            is_approved=True,
        )

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def test_token_endpoint(self):
        url = reverse('token_obtain_pair')
        data = {'username': 'testuser', 'password': 'testpass123'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_protected_routes_require_authentication_by_default(self):
        response = self.client.get('/api/churches/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_public_hierarchy_route_remains_accessible(self):
        response = self.client.get('/api/zones/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_notification_can_be_marked_as_read(self):
        self.authenticate()
        notification = Notification.objects.create(
            user=self.user,
            title='Test',
            message='Test notification',
            notification_type='info',
        )

        response = self.client.post(f'/api/notifications/{notification.id}/read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        notification.refresh_from_db()
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)

    def test_read_all_notifications_updates_only_current_user(self):
        self.authenticate()
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@test.com',
            password='testpass123',
            role='local_member',
            is_active=True,
            is_approved=True,
        )
        own_notification = Notification.objects.create(
            user=self.user,
            title='Own',
            message='Own notification',
            notification_type='info',
        )
        other_notification = Notification.objects.create(
            user=other_user,
            title='Other',
            message='Other notification',
            notification_type='info',
        )

        response = self.client.post('/api/notifications/read-all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 1)

        own_notification.refresh_from_db()
        other_notification.refresh_from_db()
        self.assertTrue(own_notification.is_read)
        self.assertFalse(other_notification.is_read)

    def test_prayer_action_increments_prayer_count(self):
        self.authenticate()
        prayer = PrayerRequest.objects.create(
            member=self.user,
            request='Please pray for my family',
            is_public=True,
        )

        response = self.client.post(f'/api/prayers/{prayer.id}/pray/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        prayer.refresh_from_db()
        self.assertEqual(prayer.prayer_count, 1)

    def test_transfer_approval_updates_status_and_member_church(self):
        self.authenticate()
        destination = Church.objects.create(name='Destination Church', church_type='local')
        transfer = Transfer.objects.create(
            member=self.user,
            from_church=self.zone,
            to_church=destination,
            transfer_reason='Relocation',
        )

        response = self.client.post(f'/api/transfers/{transfer.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        transfer.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(transfer.status, 'approved')
        self.assertEqual(self.user.church_id, destination.id)

    def test_report_export_endpoint_returns_file_response(self):
        self.authenticate()

        response = self.client.get('/api/reports/export/offerings/?format=csv')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('attachment; filename=', response['Content-Disposition'])