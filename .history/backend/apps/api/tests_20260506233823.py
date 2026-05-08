import hashlib
import hmac
import json
from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.core.cache import cache
from django.contrib.admin.models import ADDITION, LogEntry
from django.contrib.auth.tokens import default_token_generator
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.api.tasks import cleanup_audit_logs
from apps.attendance.models import AttendanceRecord
from apps.churches.models import Church
from apps.notifications.models import Notification
from apps.offerings.models import Offering
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer


class CoreApiTests(APITestCase):
    def setUp(self):
        cache.clear()
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
        self.user.role = 'national_leader'
        self.user.save(update_fields=['role'])
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

        response = self.client.get(
            reverse('export_report', kwargs={'report_type': 'offerings'}),
            {'file_format': 'csv'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('attachment; filename=', response['Content-Disposition'])

    def test_login_locks_after_repeated_failed_attempts(self):
        url = reverse('token_obtain_pair')
        for _ in range(5):
            self.client.post(url, {'username': 'testuser', 'password': 'wrongpass'}, format='json')

        locked_response = self.client.post(
            url,
            {'username': 'testuser', 'password': 'wrongpass'},
            format='json',
        )
        self.assertEqual(locked_response.status_code, status.HTTP_423_LOCKED)

    def test_password_reset_request_returns_generic_success(self):
        response = self.client.post(
            reverse('password_reset_request'),
            {'email': 'test@test.com'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)

    def test_password_reset_confirm_changes_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post(
            reverse('password_reset_confirm'),
            {
                'uid': uid,
                'token': token,
                'new_password': 'NewStrongPass123!'
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrongPass123!'))

    def test_audit_logs_forbidden_for_non_national_leader(self):
        self.authenticate()
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_logs_returns_entries_for_national_leader(self):
        self.user.role = 'national_leader'
        self.user.save(update_fields=['role'])
        self.authenticate()

        content_type = ContentType.objects.get_for_model(Church)
        LogEntry.objects.log_action(
            user_id=self.user.id,
            content_type_id=content_type.id,
            object_id=str(self.zone.id),
            object_repr=self.zone.name,
            action_flag=ADDITION,
            change_message='Created church',
        )

        response = self.client.get('/api/audit-logs/', {'limit': 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertIn('username', response.data[0])
        self.assertIn('action', response.data[0])
        self.assertIn('change_message', response.data[0])

    def test_audit_logs_can_be_bulk_deleted_by_national_leader(self):
        self.user.role = 'national_leader'
        self.user.save(update_fields=['role'])
        self.authenticate()

        content_type = ContentType.objects.get_for_model(Church)
        first_log = LogEntry.objects.log_action(
            user_id=self.user.id,
            content_type_id=content_type.id,
            object_id=str(self.zone.id),
            object_repr=self.zone.name,
            action_flag=ADDITION,
            change_message='Created first church entry',
        )
        second_log = LogEntry.objects.log_action(
            user_id=self.user.id,
            content_type_id=content_type.id,
            object_id=str(self.zone.id),
            object_repr=self.zone.name,
            action_flag=ADDITION,
            change_message='Created second church entry',
        )

        response = self.client.delete(
            '/api/audit-logs/',
            {'ids': [first_log.id, second_log.id]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['deleted_count'], 2)
        self.assertFalse(LogEntry.objects.filter(id__in=[first_log.id, second_log.id]).exists())

    def test_cleanup_audit_logs_task_respects_retention_days(self):
        content_type = ContentType.objects.get_for_model(Church)
        old_log = LogEntry.objects.log_action(
            user_id=self.user.id,
            content_type_id=content_type.id,
            object_id=str(self.zone.id),
            object_repr='Old log entry',
            action_flag=ADDITION,
            change_message='Old audit log',
        )
        recent_log = LogEntry.objects.log_action(
            user_id=self.user.id,
            content_type_id=content_type.id,
            object_id=str(self.zone.id),
            object_repr='Recent log entry',
            action_flag=ADDITION,
            change_message='Recent audit log',
        )

        LogEntry.objects.filter(id=old_log.id).update(
            action_time=timezone.now() - timedelta(days=10)
        )

        result = cleanup_audit_logs(retention_days=7)

        self.assertEqual(result.get('deleted_count'), 1)
        self.assertFalse(LogEntry.objects.filter(id=old_log.id).exists())
        self.assertTrue(LogEntry.objects.filter(id=recent_log.id).exists())

    def test_attendance_create_forbidden_outside_accessible_scope(self):
        self.authenticate()
        outsider = Church.objects.create(name='Outside Local', church_type='local')

        response = self.client.post(
            '/api/attendance/',
            {
                'church': outsider.id,
                'service_date': timezone.localdate().isoformat(),
                'service_type': 'sunday',
                'attendance_count': 55,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_stats_returns_attendance_metrics(self):
        self.authenticate()
        region = Church.objects.create(name='Region A', church_type='region', parent_church=self.zone)
        local = Church.objects.create(name='Local A', church_type='local', parent_church=region)
        member = User.objects.create_user(
            username='member1',
            email='member1@test.com',
            password='testpass123',
            church=local,
            role='local_member',
            is_active=True,
            is_approved=True,
        )

        AttendanceRecord.objects.create(
            church=local,
            service_date=timezone.localdate(),
            service_type='sunday',
            attendance_count=45,
            recorded_by=self.user,
        )

        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data.get('weekly_attendance', 0), 45)
        self.assertGreater(response.data.get('attendance_rate', 0), 0)

    @override_settings(
        PAYMENT_WEBHOOK_SIGNATURE_SECRET='unit-test-secret',
        PAYMENT_WEBHOOK_SIGNATURE_HEADER='X-Azampay-Signature',
        PAYMENT_WEBHOOK_REQUIRE_SIGNATURE=True,
    )
    def test_payment_callback_accepts_valid_signature(self):
        offering = Offering.objects.create(
            church=self.zone,
            member=self.user,
            amount=5000,
            offering_type='offering',
            payment_method='mobile_money',
            payment_status='pending',
            transaction_reference='MM-UNITTEST123',
            recorded_by=self.user,
        )

        payload = {
            'utilityref': 'MM-UNITTEST123',
            'message': 'payment successful',
            'reference': 'AZA-REF-12345',
        }
        raw_body = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        signature = hmac.new(
            b'unit-test-secret',
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        response = self.client.post(
            '/api/offerings/payments/callback/',
            data=raw_body,
            content_type='application/json',
            HTTP_X_AZAMPAY_SIGNATURE=signature,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        offering.refresh_from_db()
        self.assertEqual(offering.payment_status, 'completed')

    @override_settings(
        PAYMENT_WEBHOOK_SIGNATURE_SECRET='unit-test-secret',
        PAYMENT_WEBHOOK_SIGNATURE_HEADER='X-Azampay-Signature',
        PAYMENT_WEBHOOK_REQUIRE_SIGNATURE=True,
    )
    def test_payment_callback_rejects_invalid_signature(self):
        offering = Offering.objects.create(
            church=self.zone,
            member=self.user,
            amount=5000,
            offering_type='offering',
            payment_method='mobile_money',
            payment_status='pending',
            transaction_reference='MM-UNITTEST456',
            recorded_by=self.user,
        )

        payload = {
            'utilityref': 'MM-UNITTEST456',
            'message': 'payment successful',
            'reference': 'AZA-REF-67890',
        }

        response = self.client.post(
            '/api/offerings/payments/callback/',
            data=payload,
            format='json',
            HTTP_X_AZAMPAY_SIGNATURE='invalid-signature',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        offering.refresh_from_db()
        self.assertEqual(offering.payment_status, 'pending')