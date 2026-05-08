import csv
import uuid as _uuid_module
from django.contrib.admin.models import LogEntry
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.conf import settings
from decimal import Decimal, InvalidOperation
from django.db.models import Avg, Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from datetime import date, timedelta
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, parsers, permissions, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken as _RefreshToken
from rest_framework_simplejwt.exceptions import TokenError as _TokenError
from apps.accounts.models import User
from apps.churches.models import Church, ChurchPageEntry, Sermon
from apps.departments.models import Department, DepartmentJoinRequest, DepartmentMember
from apps.events.models import Event, EventRegistration
from apps.attendance.models import AttendanceCheckIn, AttendanceRecord
from apps.members.models import MemberRegistration
from apps.members.serializers import MemberRegistrationSerializer
from apps.news.models import News
from apps.notifications.models import Notification
from apps.offerings.models import Offering
from apps.offerings.payment_service import (
    AzampayService,
    generate_bank_reference,
    get_church_bank_details,
    get_church_mobile_money_details,
    get_or_create_church_payment_details,
)
from apps.prayers.models import PrayerRequest
from apps.reports.export import export_to_csv, export_to_excel, export_to_pdf
from apps.transfers.models import Transfer
from config.utils.notifications import create_notification
from apps.departments.serializers import DepartmentSerializer as AppDepartmentSerializer
from apps.news.serializers import NewsSerializer as AppNewsSerializer
from apps.prayers.serializers import PrayerRequestSerializer as AppPrayerRequestSerializer
from apps.transfers.serializers import TransferSerializer as AppTransferSerializer
from .throttles import LoginRateThrottle
from .serializers import (
    AttendanceCheckInSerializer,
    AttendanceSerializer,
    ChurchPageEntrySerializer,
    ChurchSerializer,
    DepartmentJoinRequestSerializer,
    EventSerializer,
    EventRegistrationSerializer,
    ChurchPaymentDetailsSerializer,
    NotificationSerializer,
    OfferingSerializer,
    SermonSerializer,
    UserSerializer,
)

# Temporary empty response for missing models
class EmptyResponseMixin:
    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        return Response([])

    def create(self, request, *args, **kwargs):
        return Response({'message': 'Created'}, status=status.HTTP_201_CREATED)


LEADER_ROLES = ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader']
ROLE_HIERARCHY = {
    'local_member': 0,
    'local_leader': 1,
    'district_leader': 2,
    'regional_leader': 3,
    'zone_leader': 4,
    'national_leader': 5,
}
MEMBER_DASHBOARD_DEPARTMENTS = [
    'Youth Ministry',
    'Choir',
    'Womens Ministry',
    'Mens Ministry',
    'Childrens Ministry',
    'Volunteers',
]
GLOBAL_BROADCAST_ROLES = ['national_leader']


def has_role_or_above(user, role):
    return ROLE_HIERARCHY.get(user.role, -1) >= ROLE_HIERARCHY.get(role, -1)


def is_global_broadcast_content(content_owner):
    return bool(content_owner and content_owner.role in GLOBAL_BROADCAST_ROLES)


def _safe_amount(value):
    if value is None:
        return 0.0
    try:
        decimal_value = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return 0.0
    if not decimal_value.is_finite():
        return 0.0
    return float(decimal_value)


def get_accessible_churches(user):
    if not getattr(user, 'is_authenticated', False):
        return Church.objects.filter(is_active=True)

    if user.role == 'national_leader':
        return Church.objects.all()

    if not user.church:
        return Church.objects.none()

    if user.role == 'zone_leader':
        return Church.objects.filter(
            Q(id=user.church.id)
            | Q(parent_church=user.church)
            | Q(parent_church__parent_church=user.church)
            | Q(parent_church__parent_church__parent_church=user.church)
        )

    if user.role == 'regional_leader':
        return Church.objects.filter(
            Q(id=user.church.id)
            | Q(parent_church=user.church)
            | Q(parent_church__parent_church=user.church)
        )

    if user.role == 'district_leader':
        return Church.objects.filter(Q(id=user.church.id) | Q(parent_church=user.church))

    return Church.objects.filter(id=user.church.id)


def get_ancestor_church_ids(church):
    ancestor_ids = []
    current = church.parent_church if church else None
    while current:
        ancestor_ids.append(current.id)
        current = current.parent_church
    return ancestor_ids


def _apply_church_hierarchy_filters(queryset, zone_id=None, region_id=None, district_id=None, church_name=None):
    if zone_id:
        queryset = queryset.filter(
            Q(id=zone_id)
            | Q(parent_church_id=zone_id)
            | Q(parent_church__parent_church_id=zone_id)
            | Q(parent_church__parent_church__parent_church_id=zone_id)
        )

    if region_id:
        queryset = queryset.filter(
            Q(id=region_id)
            | Q(parent_church_id=region_id)
            | Q(parent_church__parent_church_id=region_id)
        )

    if district_id:
        queryset = queryset.filter(
            Q(id=district_id)
            | Q(parent_church_id=district_id)
        )

    if church_name:
        queryset = queryset.filter(name__icontains=church_name.strip())

    return queryset


def _get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


def _failed_login_cache_keys(username, ip):
    username = (username or 'unknown').lower()
    return (
        f'auth:failures:{ip}:{username}',
        f'auth:lockout:{ip}:{username}',
    )


class LoginTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

    def _record_failed_login(self, failure_key, lockout_key):
        current_failures = cache.get(failure_key, 0) + 1
        cache.set(failure_key, current_failures, timeout=settings.LOGIN_FAILURE_WINDOW_SECONDS)
        max_failures = settings.MAX_FAILED_LOGIN_ATTEMPTS
        if current_failures >= max_failures:
            cache.set(lockout_key, True, timeout=settings.LOGIN_LOCKOUT_SECONDS)
            return Response(
                {'detail': 'Account temporarily locked due to repeated failed login attempts.'},
                status=status.HTTP_423_LOCKED,
            )
        return None

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '') if hasattr(request, 'data') else ''
        ip = _get_client_ip(request)
        failure_key, lockout_key = _failed_login_cache_keys(username, ip)

        if cache.get(lockout_key):
            return Response(
                {'detail': 'Account temporarily locked due to repeated failed login attempts.'},
                status=status.HTTP_423_LOCKED,
            )

        try:
            response = super().post(request, *args, **kwargs)
        except APIException:
            lock_response = self._record_failed_login(failure_key, lockout_key)
            if lock_response is not None:
                return lock_response
            raise

        if response.status_code == status.HTTP_200_OK:
            cache.delete(failure_key)
            cache.delete(lockout_key)
            return response

        lock_response = self._record_failed_login(failure_key, lockout_key)
        if lock_response is not None:
            return lock_response

        return response

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            queryset = User.objects.all()
        else:
            accessible_churches = get_accessible_churches(user)
            queryset = User.objects.filter(church__in=accessible_churches)

        role_filter = (self.request.query_params.get('role') or '').strip()
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        approved_filter = (self.request.query_params.get('is_approved') or '').strip().lower()
        if approved_filter in ['true', '1', 'yes']:
            queryset = queryset.filter(is_approved=True)
        elif approved_filter in ['false', '0', 'no']:
            queryset = queryset.filter(is_approved=False)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(church__name__icontains=search)
            )

        return queryset.order_by('full_name', 'username')

    @action(detail=False, methods=['get'], url_path='pending-regional-registrations')
    def pending_regional_registrations(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can view pending regional leader registrations.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset().filter(role='regional_leader', is_approved=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending-zone-registrations')
    def pending_zone_registrations(self, request):
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can view pending zone leader registrations.'}, status=status.HTTP_403_FORBIDDEN)
        queryset = User.objects.filter(role='zone_leader', is_approved=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='approve-zone-registration')
    def approve_zone_registration(self, request, pk=None):
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can approve zone leaders.'}, status=status.HTTP_403_FORBIDDEN)
        target_user = self.get_object()
        if target_user.role != 'zone_leader':
            return Response({'error': 'This user is not a zone leader registration.'}, status=status.HTTP_400_BAD_REQUEST)
        target_user.is_approved = True
        target_user.is_active = True
        target_user.approved_by = user
        target_user.approved_at = timezone.now()
        target_user.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at', 'updated_at'])
        create_notification(
            target_user,
            'Zone Leader Registration Approved',
            f'Your zone leader registration has been approved by {user.get_full_name()}.',
            'success',
        )
        return Response({'message': f'{target_user.get_full_name()} has been approved as a zone leader.'})

    @action(detail=True, methods=['post'], url_path='reject-zone-registration')
    def reject_zone_registration(self, request, pk=None):
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can reject zone leaders.'}, status=status.HTTP_403_FORBIDDEN)
        target_user = self.get_object()
        if target_user.role != 'zone_leader':
            return Response({'error': 'This user is not a zone leader registration.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = (request.data.get('reason') or '').strip()
        target_user.is_approved = False
        target_user.is_active = False
        target_user.approved_by = user
        target_user.approved_at = timezone.now()
        target_user.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at', 'updated_at'])
        create_notification(
            target_user,
            'Zone Leader Registration Rejected',
            f'Your zone leader registration was rejected. {reason}'.strip(),
            'warning',
        )
        return Response({'message': f'{target_user.get_full_name()} has been rejected as a zone leader.'})

    @action(detail=True, methods=['post'], url_path='approve-regional-registration')
    def approve_regional_registration(self, request, pk=None):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can approve regional leaders.'}, status=status.HTTP_403_FORBIDDEN)

        target_user = self.get_object()
        if target_user.role != 'regional_leader':
            return Response({'error': 'This user is not a regional leader registration.'}, status=status.HTTP_400_BAD_REQUEST)

        if target_user.church_id and not get_accessible_churches(user).filter(id=target_user.church_id).exists() and user.role != 'national_leader':
            return Response({'error': 'You cannot approve this regional leader.'}, status=status.HTTP_403_FORBIDDEN)

        target_user.is_approved = True
        target_user.is_active = True
        target_user.approved_by = user
        target_user.approved_at = timezone.now()
        target_user.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at', 'updated_at'])

        create_notification(
            target_user,
            'Regional Leader Registration Approved',
            f'Your regional leader registration has been approved by {user.get_full_name()}.',
            'success',
        )

        return Response({'message': f'{target_user.get_full_name()} has been approved as a regional leader.'})

    @action(detail=True, methods=['post'], url_path='reject-regional-registration')
    def reject_regional_registration(self, request, pk=None):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can reject regional leaders.'}, status=status.HTTP_403_FORBIDDEN)

        target_user = self.get_object()
        if target_user.role != 'regional_leader':
            return Response({'error': 'This user is not a regional leader registration.'}, status=status.HTTP_400_BAD_REQUEST)

        if target_user.church_id and not get_accessible_churches(user).filter(id=target_user.church_id).exists() and user.role != 'national_leader':
            return Response({'error': 'You cannot reject this regional leader.'}, status=status.HTTP_403_FORBIDDEN)

        reason = (request.data.get('reason') or request.data.get('rejection_reason') or '').strip()
        target_user.is_approved = False
        target_user.is_active = False
        target_user.approved_by = user
        target_user.approved_at = timezone.now()
        target_user.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at', 'updated_at'])

        create_notification(
            target_user,
            'Regional Leader Registration Rejected',
            f'Your regional leader registration was rejected. {reason}'.strip(),
            'warning',
        )

        return Response({'message': f'{target_user.get_full_name()} has been rejected as a regional leader.'})

class ChurchViewSet(viewsets.ModelViewSet):
    queryset = Church.objects.all()
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def _validate_parent_church_access(self, serializer):
        user = self.request.user
        church_type = serializer.validated_data.get('church_type')
        parent_church = serializer.validated_data.get('parent_church')

        if church_type == 'local':
            if not parent_church:
                raise DRFValidationError({'parent_church': 'District is required when creating a local church.'})
            if parent_church.church_type != 'district':
                raise DRFValidationError({'parent_church': 'Local church must belong to a district.'})
            if user.role != 'national_leader' and not get_accessible_churches(user).filter(id=parent_church.id).exists():
                raise PermissionDenied('You cannot create or move a church under this district.')

        elif parent_church and user.role != 'national_leader' and not get_accessible_churches(user).filter(id=parent_church.id).exists():
            raise PermissionDenied('You cannot assign this parent church.')
    
    def get_queryset(self):
        user = self.request.user
        search = (self.request.query_params.get('search') or self.request.query_params.get('q') or self.request.query_params.get('church_name') or '').strip()
        alphabet = (self.request.query_params.get('alphabet') or '').strip()
        church_type = (self.request.query_params.get('church_type') or '').strip()
        zone_id = self.request.query_params.get('zone_id')
        region_id = self.request.query_params.get('region_id')
        district_id = self.request.query_params.get('district_id')

        queryset = get_accessible_churches(user)

        queryset = _apply_church_hierarchy_filters(
            queryset,
            zone_id=zone_id,
            region_id=region_id,
            district_id=district_id,
            church_name=self.request.query_params.get('church_name'),
        )

        if church_type:
            queryset = queryset.filter(church_type=church_type)

        if search:
            queryset = queryset.filter(name__icontains=search)
        if alphabet:
            queryset = queryset.filter(name__istartswith=alphabet[0])

        return queryset.order_by('name')

    def perform_create(self, serializer):
        self._validate_parent_church_access(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._validate_parent_church_access(serializer)
        serializer.save()

    @action(detail=True, methods=['post'], url_path='assign-pastor')
    def assign_pastor(self, request, pk=None):
        """Assign a user as pastor (local_leader) of a church. Available to district_leader and above."""
        church = self.get_object()
        user = request.user

        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader']:
            return Response({'error': 'Only district leaders and above can assign pastors.'}, status=status.HTTP_403_FORBIDDEN)

        if not get_accessible_churches(user).filter(id=church.id).exists():
            return Response({'error': 'You cannot assign a pastor to this church.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not get_accessible_churches(user).filter(id=target_user.church_id).exists() and target_user.church_id != church.id:
            return Response({'error': 'This user is not in your accessible churches.'}, status=status.HTTP_403_FORBIDDEN)

        old_role = target_user.role
        target_user.role = 'local_leader'
        target_user.church = church
        target_user.is_active = True
        target_user.is_approved = True
        target_user.save(update_fields=['role', 'church', 'is_active', 'is_approved', 'updated_at'])

        create_notification(
            target_user,
            'Pastor Assignment',
            f'You have been assigned as pastor at {church.name} by {user.get_full_name()}.',
            'success',
        )

        return Response({
            'message': f'{target_user.get_full_name()} has been assigned as pastor at {church.name}.',
            'user_id': target_user.id,
            'church_id': church.id,
            'previous_role': old_role,
        })

    @action(detail=True, methods=['post'], url_path='assign-district-leader')
    def assign_district_leader(self, request, pk=None):
        """Assign a user as district_leader of a district church. Available to regional_leader and above."""
        church = self.get_object()
        user = request.user

        if user.role not in ['national_leader', 'zone_leader', 'regional_leader']:
            return Response({'error': 'Only regional leaders and above can assign district leaders.'}, status=status.HTTP_403_FORBIDDEN)

        if church.church_type != 'district':
            return Response({'error': 'This church is not a district church.'}, status=status.HTTP_400_BAD_REQUEST)

        if not get_accessible_churches(user).filter(id=church.id).exists():
            return Response({'error': 'You cannot assign a district leader to this church.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not get_accessible_churches(user).filter(id=target_user.church_id).exists() and target_user.church_id != church.id:
            return Response({'error': 'This user is not in your accessible churches.'}, status=status.HTTP_403_FORBIDDEN)

        old_role = target_user.role
        target_user.role = 'district_leader'
        target_user.church = church
        target_user.is_active = True
        target_user.is_approved = True
        target_user.save(update_fields=['role', 'church', 'is_active', 'is_approved', 'updated_at'])

        create_notification(
            target_user,
            'District Leader Assignment',
            f'You have been assigned as district leader of {church.name} by {user.get_full_name()}.',
            'success',
        )

        return Response({
            'message': f'{target_user.get_full_name()} has been assigned as district leader of {church.name}.',
            'user_id': target_user.id,
            'church_id': church.id,
            'previous_role': old_role,
        })

    @action(detail=True, methods=['post'], url_path='assign-zone-leader')
    def assign_zone_leader(self, request, pk=None):
        """Assign a user as zone_leader of a zone church. National leader only."""
        church = self.get_object()
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can assign zone leaders.'}, status=status.HTTP_403_FORBIDDEN)
        if church.church_type != 'zone':
            return Response({'error': 'This church is not a zone church.'}, status=status.HTTP_400_BAD_REQUEST)
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        old_role = target_user.role
        target_user.role = 'zone_leader'
        target_user.church = church
        target_user.is_active = True
        target_user.is_approved = True
        target_user.approved_by = user
        target_user.approved_at = timezone.now()
        target_user.save(update_fields=['role', 'church', 'is_active', 'is_approved', 'approved_by', 'approved_at', 'updated_at'])
        create_notification(
            target_user,
            'Zone Leader Assignment',
            f'You have been assigned as zone leader of {church.name} by {user.get_full_name()}.',
            'success',
        )
        return Response({
            'message': f'{target_user.get_full_name()} has been assigned as zone leader of {church.name}.',
            'user_id': target_user.id,
            'church_id': church.id,
            'previous_role': old_role,
        })

    @action(detail=True, methods=['post'], url_path='assign-regional-leader')
    def assign_regional_leader(self, request, pk=None):
        """Assign a user as regional_leader of a region church. Available to zone_leader and above."""
        church = self.get_object()
        user = request.user

        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can assign regional leaders.'}, status=status.HTTP_403_FORBIDDEN)

        if church.church_type != 'region':
            return Response({'error': 'This church is not a region church.'}, status=status.HTTP_400_BAD_REQUEST)

        if not get_accessible_churches(user).filter(id=church.id).exists() and user.role != 'national_leader':
            return Response({'error': 'You cannot assign a regional leader to this church.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not get_accessible_churches(user).filter(id=target_user.church_id).exists() and target_user.church_id != church.id and user.role != 'national_leader':
            return Response({'error': 'This user is not in your accessible churches.'}, status=status.HTTP_403_FORBIDDEN)

        old_role = target_user.role
        target_user.role = 'regional_leader'
        target_user.church = church
        target_user.is_active = True
        target_user.is_approved = True
        target_user.approved_by = user
        target_user.approved_at = timezone.now()
        target_user.save(update_fields=['role', 'church', 'is_active', 'is_approved', 'approved_by', 'approved_at', 'updated_at'])

        create_notification(
            target_user,
            'Regional Leader Assignment',
            f'You have been assigned as regional leader of {church.name} by {user.get_full_name()}.',
            'success',
        )

        return Response({
            'message': f'{target_user.get_full_name()} has been assigned as regional leader of {church.name}.',
            'user_id': target_user.id,
            'church_id': church.id,
            'previous_role': old_role,
        })

class MemberViewSet(viewsets.ModelViewSet):
    """View for church members (users with member roles)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    
    def get_queryset(self):
        user = self.request.user
        user_church = user.church
        queryset = User.objects.none()
        include_all = str(self.request.query_params.get('include_all', '')).lower() in ['1', 'true', 'yes']
        
        # Role-based filtering
        if user.role == 'national_leader':
            # National leader can view every user when explicitly requested.
            if include_all:
                queryset = User.objects.all()
            else:
                queryset = User.objects.filter(role__in=['local_member', 'local_leader'])
        
        elif user.role == 'zone_leader' and user_church:
            # Zone leader sees members in their zone and below
            zone_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church) |
                Q(parent_church__parent_church__parent_church=user_church)
            )
            queryset = User.objects.filter(church__in=zone_churches, role__in=['local_member', 'local_leader'])
        
        elif user.role == 'regional_leader' and user_church:
            # Regional leader sees members in their region and below
            region_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church)
            )
            queryset = User.objects.filter(church__in=region_churches, role__in=['local_member', 'local_leader'])
        
        elif user.role == 'district_leader' and user_church:
            # District leader sees members in their district and below
            district_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church)
            )
            queryset = User.objects.filter(church__in=district_churches, role__in=['local_member', 'local_leader'])
        
        elif user_church:
            # Local leader or member sees only their church
            queryset = User.objects.filter(church=user_church, role__in=['local_member', 'local_leader'])

        search = (self.request.query_params.get('search') or self.request.query_params.get('q') or '').strip()
        alphabet = (self.request.query_params.get('alphabet') or '').strip()
        church_name = (self.request.query_params.get('church_name') or '').strip()
        zone_id = self.request.query_params.get('zone_id')
        region_id = self.request.query_params.get('region_id')
        district_id = self.request.query_params.get('district_id')

        if zone_id or region_id or district_id:
            scoped_churches = _apply_church_hierarchy_filters(
                get_accessible_churches(user),
                zone_id=zone_id,
                region_id=region_id,
                district_id=district_id,
            )
            queryset = queryset.filter(church__in=scoped_churches)

        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(username__icontains=search)
                | Q(email__icontains=search)
            )
        if alphabet:
            starts_with = alphabet[0]
            queryset = queryset.filter(
                Q(full_name__istartswith=starts_with) | Q(username__istartswith=starts_with)
            )
        if church_name:
            queryset = queryset.filter(church__name__icontains=church_name)
        
        role_filter = (self.request.query_params.get('role') or '').strip()
        if role_filter and user.role in LEADER_ROLES:
            queryset = queryset.filter(role=role_filter)

        return queryset.order_by('full_name', 'username')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='transfer')
    def transfer(self, request, pk=None):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'Only leaders can create transfer requests for members.'}, status=status.HTTP_403_FORBIDDEN)

        member = self.get_object()
        if not get_accessible_churches(user).filter(id=member.church_id).exists():
            return Response({'error': 'You cannot transfer this member.'}, status=status.HTTP_403_FORBIDDEN)

        to_church_id = request.data.get('to_church') or request.data.get('to_church_id')
        if not to_church_id:
            return Response({'error': 'Destination church is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            to_church = Church.objects.get(id=to_church_id)
        except Church.DoesNotExist:
            return Response({'error': 'Destination church not found.'}, status=status.HTTP_400_BAD_REQUEST)

        transfer_reason = (request.data.get('transfer_reason') or '').strip()
        if not transfer_reason:
            return Response({'error': 'Transfer reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        transfer = Transfer.objects.create(
            member=member,
            from_church=member.church,
            to_church=to_church,
            transfer_reason=transfer_reason,
            recommendation_letter=request.FILES.get('recommendation_letter'),
            notes=(request.data.get('notes') or '').strip(),
            status='pending',
        )

        if member.id != user.id:
            create_notification(
                member,
                'Transfer Request Submitted',
                f'A transfer request has been submitted for you to move to {to_church.name}.',
                'info',
            )

        serializer = AppTransferSerializer(transfer, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='export')
    def export_members(self, request):
        """Export church members to CSV or Excel format"""
        if request.user.role not in ['national_leader', 'local_leader', 'zone_leader', 'regional_leader', 'district_leader']:
            return Response({'error': 'You are not authorized to export members.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset()
        format_type = (request.query_params.get('file_format') or request.query_params.get('format') or 'csv').lower()

        if format_type == 'excel':
            try:
                file_data, filename = export_to_excel('members', {'queryset': queryset})
                response = HttpResponse(file_data, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:  # CSV
            filename = f'members-{request.user.church_id or "all"}-{timezone.now().strftime("%Y%m%d")}.csv'
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'

            writer = csv.writer(response)
            writer.writerow(['Church Members Export'])
            writer.writerow([f'Exported on {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'])
            writer.writerow([])
            writer.writerow(['Full Name', 'Email', 'Phone', 'Role', 'Church', 'Status'])

            for member in queryset:
                writer.writerow([
                    member.get_full_name(),
                    member.email or '',
                    member.phone or '',
                    member.get_role_display() if hasattr(member, 'get_role_display') else member.role,
                    member.church.name if member.church else '',
                    'Active' if member.is_active else 'Inactive',
                ])

            return response

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        queryset = Event.objects.select_related('church', 'created_by')

        now = timezone.now()

        if not user.is_authenticated:
            queryset = queryset.filter(
                is_active=True,
                created_by__role__in=GLOBAL_BROADCAST_ROLES,
            )
        else:
            visible_church_ids = set(get_accessible_churches(user).values_list('id', flat=True))
            if user.church_id:
                visible_church_ids.update(get_ancestor_church_ids(user.church))

            queryset = queryset.filter(
                Q(church_id__in=visible_church_ids)
                | Q(created_by__role__in=GLOBAL_BROADCAST_ROLES)
            )

        church_id = self.request.query_params.get('church_id')
        if church_id:
            queryset = queryset.filter(church_id=church_id)

        if self.request.query_params.get('active') == 'true':
            queryset = queryset.filter(is_active=True)
        if self.request.query_params.get('popup') == 'true':
            queryset = queryset.filter(is_popup_news=True)
        if self.request.query_params.get('is_popup_news') == 'true':
            queryset = queryset.filter(is_popup_news=True)
        if self.request.query_params.get('upcoming') == 'true':
            queryset = queryset.filter(is_active=True).filter(
                Q(end_date__gte=now)
                | Q(end_date__isnull=True, start_date__gte=now)
            ).order_by('start_date', 'created_at')
        if self.request.query_params.get('past') == 'true':
            queryset = queryset.filter(
                Q(end_date__lt=now)
                | Q(end_date__isnull=True, start_date__lt=now)
            ).order_by('-start_date')

        return queryset.distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if request.query_params.get('popup') == 'true' or request.query_params.get('is_popup_news') == 'true':
            serializer = self.get_serializer(queryset[:10], many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        if self.request.user.role not in LEADER_ROLES:
            raise PermissionDenied('Only leaders can create events.')

        user = self.request.user
        church = user.church
        if church is None and user.role == 'national_leader':
            church = Church.objects.filter(church_type='national').first()

        if church is None:
            raise PermissionDenied('Your profile must be assigned to a church to create events.')

        serializer.save(church=church, created_by=user)

    def perform_update(self, serializer):
        event = self.get_object()
        if event.created_by_id != self.request.user.id:
            raise PermissionDenied('Only the creator can edit this event.')
        serializer.save(church=event.church, created_by=event.created_by)

    def perform_destroy(self, instance):
        if instance.created_by_id != self.request.user.id:
            raise PermissionDenied('Only the creator can delete this event.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        event = self.get_object()
        user = request.user

        can_register = bool(
            user.church_id and event.church_id == user.church_id
        ) or is_global_broadcast_content(event.created_by)

        if not can_register:
            return Response({'error': 'You are not allowed to register for this event.'}, status=status.HTTP_403_FORBIDDEN)

        if event.registration_deadline and event.registration_deadline < timezone.now():
            return Response({'error': 'Registration deadline has passed.'}, status=status.HTTP_400_BAD_REQUEST)

        active_count = EventRegistration.objects.filter(event=event, status='registered').count()
        if event.capacity and active_count >= event.capacity:
            return Response({'error': 'This event is full.'}, status=status.HTTP_400_BAD_REQUEST)

        registration, created = EventRegistration.objects.get_or_create(
            event=event,
            member=user,
            defaults={'status': 'registered'},
        )

        if not created and registration.status == 'registered':
            return Response({'message': 'You are already registered for this event.'})

        if not created and registration.status == 'cancelled':
            registration.status = 'registered'
            registration.save(update_fields=['status'])

        leaders = User.objects.filter(
            church=event.church,
            role__in=LEADER_ROLES,
            is_active=True,
        )
        for leader in leaders:
            create_notification(
                leader,
                'Event Registration',
                f'{user.get_full_name()} registered for {event.title}.',
                'info',
            )

        return Response(EventRegistrationSerializer(registration).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my-registrations')
    def my_registrations(self, request):
        queryset = EventRegistration.objects.filter(member=request.user).select_related('event').order_by('-registered_at')
        serializer = EventRegistrationSerializer(queryset, many=True)
        return Response(serializer.data)

class OfferingViewSet(viewsets.ModelViewSet):
    queryset = Offering.objects.all()
    serializer_class = OfferingSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        churches = get_accessible_churches(user)
        queryset = Offering.objects.filter(church__in=churches).select_related('church', 'member', 'recorded_by')

        member_id = self.request.query_params.get('member_id')
        offering_type = self.request.query_params.get('offering_type')

        if user.role == 'local_member':
            queryset = queryset.filter(member=user)

        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if offering_type:
            queryset = queryset.filter(offering_type=offering_type)

        return queryset

    @action(detail=False, methods=['get'], url_path='my-history')
    def my_history(self, request):
        queryset = Offering.objects.filter(member=request.user).order_by('-payment_date', '-created_at')

        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)

        totals_by_type = queryset.values('offering_type').annotate(total=Sum('amount'))
        by_type = {
            row['offering_type']: _safe_amount(row['total'])
            for row in totals_by_type
        }
        overall_total = _safe_amount(queryset.aggregate(total=Sum('amount'))['total'])

        serializer = OfferingSerializer(queryset, many=True)
        return Response(
            {
                'member': {
                    'id': request.user.id,
                    'full_name': request.user.get_full_name(),
                    'email': request.user.email,
                },
                'total_amount': overall_total,
                'by_type': by_type,
                'records': serializer.data,
            }
        )

    @action(detail=False, methods=['get'], url_path='statement/download')
    def statement_download(self, request):
        queryset = Offering.objects.filter(member=request.user).order_by('payment_date', 'created_at')

        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)

        filename_from = start_date or 'start'
        filename_to = end_date or 'today'
        filename = f'giving-statement-{request.user.id}-{filename_from}-to-{filename_to}.csv'

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(['CFCT Giving Statement'])
        writer.writerow(['Member Name', request.user.get_full_name()])
        writer.writerow(['Member Email', request.user.email or ''])
        writer.writerow(['Period Start', start_date or ''])
        writer.writerow(['Period End', end_date or ''])
        writer.writerow(['Generated On', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])
        writer.writerow(['Date', 'Type', 'Amount', 'Payment Method', 'Receipt No', 'Church'])

        totals_by_type = {}
        grand_total = Decimal('0.00')
        for item in queryset:
            item_amount = item.amount or Decimal('0.00')
            grand_total += item_amount
            totals_by_type[item.offering_type] = totals_by_type.get(item.offering_type, Decimal('0.00')) + item_amount
            writer.writerow(
                [
                    item.payment_date.isoformat() if item.payment_date else '',
                    item.get_offering_type_display(),
                    f'{item_amount:.2f}',
                    item.get_payment_method_display() if hasattr(item, 'get_payment_method_display') else item.payment_method,
                    item.receipt_no,
                    item.church.name if item.church_id else '',
                ]
            )

        writer.writerow([])
        writer.writerow(['Summary by Type'])
        writer.writerow(['Type', 'Total Amount'])
        for key, amount in sorted(totals_by_type.items()):
            writer.writerow([dict(Offering.OFFERING_TYPES).get(key, key), f'{amount:.2f}'])
        writer.writerow(['Grand Total', f'{grand_total:.2f}'])

        return response

    def perform_create(self, serializer):
        import uuid as _uuid
        # Ensure user has a church assigned
        if not self.request.user.church:
            raise DRFValidationError({"church": "Your profile must be assigned to a church to record offerings."})

        # Parse member if provided
        member_data = serializer.validated_data.get('member')
        member = None
        if member_data:
            if isinstance(member_data, User):
                member = member_data
            elif isinstance(member_data, (int, float)):
                try:
                    member = User.objects.get(id=int(member_data))
                except User.DoesNotExist:
                    raise DRFValidationError({"member": "Invalid member ID provided."})

        # Auto-set payment_status: cash → completed, others → pending
        payment_method = serializer.validated_data.get('payment_method', 'cash')
        payment_status = 'completed' if payment_method == 'cash' else 'pending'

        # Always ensure a unique transaction_reference
        tx_ref = (
            serializer.validated_data.get('transaction_reference')
            or f"TXN-{_uuid.uuid4().hex[:12].upper()}"
        )

        try:
            serializer.save(
                church=self.request.user.church,
                recorded_by=self.request.user,
                member=member,
                payment_status=payment_status,
                transaction_reference=tx_ref,
            )
        except Exception as e:
            raise DRFValidationError({"non_field_errors": f"Error saving offering: {str(e)}"})


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        churches = get_accessible_churches(user)
        queryset = AttendanceRecord.objects.filter(church__in=churches).select_related('church', 'recorded_by')

        church_id = self.request.query_params.get('church_id')
        if church_id:
            queryset = queryset.filter(church_id=church_id)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(service_date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(service_date__lte=end_date)

        service_type = self.request.query_params.get('service_type')
        if service_type:
            queryset = queryset.filter(service_type=service_type)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        accessible_churches = get_accessible_churches(user)
        church = serializer.validated_data.get('church') or user.church

        if church is None:
            raise PermissionDenied('A church is required to record attendance.')

        if not accessible_churches.filter(id=church.id).exists():
            raise PermissionDenied('You are not allowed to record attendance for this church.')

        serializer.save(church=church, recorded_by=user)

    @action(detail=False, methods=['post'], url_path='qr-session')
    def qr_session(self, request):
        if request.user.role not in LEADER_ROLES:
            return Response({'detail': 'Only leaders can create attendance QR sessions.'}, status=status.HTTP_403_FORBIDDEN)

        church_id = request.data.get('church_id') or request.user.church_id
        service_type = (request.data.get('service_type') or 'sunday').strip()
        service_title = (request.data.get('service_title') or '').strip()
        service_date_value = (request.data.get('service_date') or '').strip()

        if not church_id:
            return Response({'detail': 'church_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not get_accessible_churches(request.user).filter(id=church_id).exists():
            return Response({'detail': 'You cannot create QR sessions for this church.'}, status=status.HTTP_403_FORBIDDEN)

        if service_type not in dict(AttendanceRecord.SERVICE_TYPES):
            return Response({'detail': 'Invalid service type.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            service_date = date.fromisoformat(service_date_value) if service_date_value else timezone.localdate()
        except ValueError:
            return Response({'detail': 'service_date must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)

        token_payload = {
            'church_id': int(church_id),
            'service_type': service_type,
            'service_title': service_title,
            'service_date': service_date.isoformat(),
            'issued_by': request.user.id,
        }
        qr_token = signing.dumps(token_payload, salt='attendance-qr-checkin')

        frontend_base = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        checkin_url = f"{frontend_base}/attendance?checkin={qr_token}" if frontend_base else qr_token

        return Response(
            {
                'qr_token': qr_token,
                'checkin_url': checkin_url,
                'expires_in_seconds': 43200,
                'payload': token_payload,
            }
        )

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        qr_token = (request.data.get('qr_token') or '').strip()
        if not qr_token:
            return Response({'detail': 'qr_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = signing.loads(qr_token, salt='attendance-qr-checkin', max_age=43200)
        except signing.BadSignature:
            return Response({'detail': 'Invalid or expired QR token.'}, status=status.HTTP_400_BAD_REQUEST)

        church_id = payload.get('church_id')
        service_type = payload.get('service_type')
        service_title = payload.get('service_title') or ''
        service_date_raw = payload.get('service_date')

        if not church_id or not service_date_raw or service_type not in dict(AttendanceRecord.SERVICE_TYPES):
            return Response({'detail': 'Malformed QR token payload.'}, status=status.HTTP_400_BAD_REQUEST)

        if not get_accessible_churches(request.user).filter(id=church_id).exists():
            return Response({'detail': 'You are not allowed to check in for this church.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            service_date = date.fromisoformat(service_date_raw)
        except ValueError:
            return Response({'detail': 'Malformed service date in token.'}, status=status.HTTP_400_BAD_REQUEST)

        checkin, created = AttendanceCheckIn.objects.get_or_create(
            church_id=church_id,
            member=request.user,
            service_date=service_date,
            service_type=service_type,
            service_title=service_title,
            defaults={'checkin_token': qr_token},
        )

        serializer = AttendanceCheckInSerializer(checkin)
        return Response(
            {
                'status': 'checked_in' if created else 'already_checked_in',
                'record': serializer.data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], url_path='my-history')
    def my_history(self, request):
        queryset = AttendanceCheckIn.objects.filter(member=request.user).select_related('church')

        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(service_date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(service_date__lte=end_date)

        serializer = AttendanceCheckInSerializer(queryset.order_by('-service_date', '-checked_in_at'), many=True)
        return Response(serializer.data)

class PrayerViewSet(viewsets.ModelViewSet):
    queryset = PrayerRequest.objects.all()
    serializer_class = AppPrayerRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        accessible_churches = get_accessible_churches(user)
        queryset = PrayerRequest.objects.select_related('member')

        if user.role in LEADER_ROLES or user.role == 'finance_team' or user.is_staff:
            queryset = queryset.filter(member__church__in=accessible_churches)
        else:
            # Members see their own requests + public requests from their church
            if user.church_id:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(member=user) | Q(is_public=True, member__church_id=user.church_id)
                ).distinct()
            else:
                queryset = queryset.filter(member=user)

        status_filter = (self.request.query_params.get('status') or '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def perform_create(self, serializer):
        is_public = bool(self.request.data.get('is_public', False))
        prayer = serializer.save(member=self.request.user, is_public=is_public, status='pending')

        if self.request.user.church_id:
            leaders = User.objects.filter(
                church_id=self.request.user.church_id,
                role='local_leader',
                is_active=True,
            )

            if not leaders.exists():
                leaders = User.objects.filter(
                    church_id=self.request.user.church_id,
                    role__in=LEADER_ROLES,
                    is_active=True,
                )

            for leader in leaders:
                create_notification(
                    leader,
                    'New Prayer Request',
                    f'{self.request.user.get_full_name()} submitted a prayer request.',
                    'info',
                )

    def perform_destroy(self, instance):
        user = self.request.user

        if user.role in LEADER_ROLES:
            if not get_accessible_churches(user).filter(id=instance.member.church_id).exists():
                raise PermissionDenied('You are not allowed to delete this prayer request.')
            instance.delete()
            return

        if instance.member_id != user.id:
            raise PermissionDenied('You can only delete your own prayer request.')

        instance.delete()

    @action(detail=True, methods=['post'], url_path='mark-done')
    def mark_done(self, request, pk=None):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'Only church leaders can mark prayer requests as done.'}, status=status.HTTP_403_FORBIDDEN)

        prayer = self.get_object()
        if not get_accessible_churches(user).filter(id=prayer.member.church_id).exists():
            return Response({'error': 'You are not allowed to update this prayer request.'}, status=status.HTTP_403_FORBIDDEN)

        prayer.status = 'answered'
        prayer.answer_notes = (request.data.get('answer_notes') or '').strip()
        prayer.save(update_fields=['status', 'answer_notes', 'updated_at'])

        create_notification(
            prayer.member,
            'Prayer Request Updated',
            'Your prayer request has been marked as done by your church pastor.',
            'success',
        )

        return Response(self.get_serializer(prayer).data)

    @action(detail=True, methods=['post'])
    def pray(self, request, pk=None):
        prayer = self.get_object()
        prayer.prayer_count += 1
        prayer.save(update_fields=['prayer_count'])
        return Response({'message': 'Prayer recorded', 'prayer_count': prayer.prayer_count})

class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.all()
    serializer_class = AppTransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        user = self.request.user
        accessible_churches = get_accessible_churches(user)
        queryset = Transfer.objects.filter(
            Q(from_church__in=accessible_churches)
            | Q(to_church__in=accessible_churches)
            | Q(member=user)
        ).select_related('member', 'from_church', 'to_church').distinct()

        status_filter = (self.request.query_params.get('status') or '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        requested_member = serializer.validated_data.get('member')

        if user.role in LEADER_ROLES:
            member = requested_member or user
            if member.church_id and not get_accessible_churches(user).filter(id=member.church_id).exists():
                raise PermissionDenied('You cannot create a transfer for this member.')
        else:
            member = user

        from_church = serializer.validated_data.get('from_church') or member.church
        if from_church is None:
            raise DRFValidationError({'from_church': 'Source church is required.'})

        if user.role in LEADER_ROLES and not get_accessible_churches(user).filter(id=from_church.id).exists():
            raise PermissionDenied('You cannot create a transfer from this church.')

        transfer = serializer.save(member=member, from_church=from_church)

        leaders = User.objects.filter(church=from_church, role='local_leader', is_active=True).exclude(id=user.id)
        for leader in leaders:
            create_notification(
                leader,
                'New Transfer Request',
                f'{member.get_full_name()} has submitted a transfer request.',
                'info',
            )

        if member.id == user.id:
            create_notification(
                member,
                'Transfer Request Submitted',
                'Your transfer request has been submitted and is pending pastor review.',
                'info',
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        user = request.user

        if user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to approve this transfer'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == 'national_leader':
            transfer.approved_by_from = transfer.approved_by_from or user
            transfer.approved_by_to = transfer.approved_by_to or user
        elif user.role in ['district_leader', 'regional_leader', 'zone_leader']:
            accessible = get_accessible_churches(user)
            has_from = accessible.filter(id=transfer.from_church_id).exists()
            has_to = accessible.filter(id=transfer.to_church_id).exists()
            if not has_from and not has_to:
                return Response({'error': 'You are not authorized to approve this transfer'}, status=status.HTTP_403_FORBIDDEN)
            if has_from:
                transfer.approved_by_from = transfer.approved_by_from or user
            if has_to:
                transfer.approved_by_to = transfer.approved_by_to or user
        elif transfer.from_church == user.church:
            transfer.approved_by_from = transfer.approved_by_from or user
        elif transfer.to_church == user.church:
            transfer.approved_by_to = transfer.approved_by_to or user
        else:
            return Response({'error': 'You are not authorized to approve this transfer'}, status=status.HTTP_403_FORBIDDEN)

        if transfer.status != 'pending':
            return Response({'error': 'This transfer has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        decision_message = (request.data.get('message') or '').strip()
        if decision_message:
            existing_notes = (transfer.notes or '').strip()
            transfer.notes = f"{existing_notes}\nApproved note: {decision_message}".strip()

        if transfer.approved_by_from and transfer.approved_by_to:
            transfer.status = 'approved'
            transfer.approval_date = timezone.now()
            transfer.member.church = transfer.to_church
            transfer.member.save(update_fields=['church'])
        elif user.role == 'local_leader' and transfer.from_church == user.church:
            # Pastoral approval flow: local pastor can finalize the transfer.
            transfer.status = 'approved'
            transfer.approval_date = timezone.now()
            transfer.member.church = transfer.to_church
            transfer.member.save(update_fields=['church'])

        transfer.save()

        create_notification(
            transfer.member,
            'Transfer Request Approved',
            decision_message or f'Your transfer request to {transfer.to_church.name} has been approved.',
            'success',
        )

        return Response(self.get_serializer(transfer).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        user = request.user

        if user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to reject this transfer'}, status=status.HTTP_403_FORBIDDEN)

        accessible = get_accessible_churches(user)
        can_review = (
            user.role == 'national_leader'
            or transfer.from_church == user.church
            or transfer.to_church == user.church
            or accessible.filter(Q(id=transfer.from_church_id) | Q(id=transfer.to_church_id)).exists()
        )
        if not can_review:
            return Response({'error': 'You are not authorized to reject this transfer'}, status=status.HTTP_403_FORBIDDEN)

        if transfer.status != 'pending':
            return Response({'error': 'This transfer has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        reason = (request.data.get('reason') or request.data.get('rejection_reason') or '').strip()
        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        transfer.status = 'rejected'
        transfer.approval_date = timezone.now()
        existing_notes = (transfer.notes or '').strip()
        transfer.notes = f"{existing_notes}\nRejected reason: {reason}".strip()
        transfer.save(update_fields=['status', 'approval_date', 'notes', 'updated_at'])

        create_notification(
            transfer.member,
            'Transfer Request Rejected',
            f'Your transfer request was rejected. Reason: {reason}',
            'warning',
        )

        return Response(self.get_serializer(transfer).data)

    @action(detail=False, methods=['get'], url_path='pending-review')
    def pending_review(self, request):
        if request.user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to review transfers.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset().filter(status='pending')
        if request.user.role == 'local_leader' and request.user.church_id:
            queryset = queryset.filter(from_church_id=request.user.church_id, approved_by_from__isnull=True)

        serializer = self.get_serializer(queryset.order_by('-created_at'), many=True)
        return Response(serializer.data)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response({'updated': updated})

    @action(detail=False, methods=['post'], url_path='broadcast')
    def broadcast(self, request):
        """Send a notification to all pastors/members in the accessible scope. District leaders and above only."""
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader']:
            return Response({'error': 'Only district leaders and above can broadcast notifications.'}, status=status.HTTP_403_FORBIDDEN)

        title = (request.data.get('title') or '').strip()
        message = (request.data.get('message') or '').strip()
        target_role = (request.data.get('target_role') or 'local_leader').strip()

        if not title or not message:
            return Response({'error': 'title and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_roles = ['local_leader', 'local_member', 'district_leader', 'regional_leader', 'zone_leader', 'all']
        if target_role not in valid_roles:
            target_role = 'local_leader'

        accessible_churches = get_accessible_churches(user)
        if target_role == 'all':
            recipients = User.objects.filter(church__in=accessible_churches, is_active=True).exclude(id=user.id)
        else:
            recipients = User.objects.filter(church__in=accessible_churches, role=target_role, is_active=True).exclude(id=user.id)

        count = 0
        for recipient in recipients:
            create_notification(recipient, title, message, 'info')
            count += 1

        return Response({
            'message': f'Notification sent to {count} recipients.',
            'count': count,
        })

class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all()
    serializer_class = AppNewsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            queryset = News.objects.filter(
                status='published',
                author__role__in=GLOBAL_BROADCAST_ROLES,
            )
        else:
            visible_church_ids = set(get_accessible_churches(user).values_list('id', flat=True))
            if user.church_id:
                visible_church_ids.update(get_ancestor_church_ids(user.church))

            queryset = News.objects.filter(
                Q(church_id__in=visible_church_ids)
                | Q(author__role__in=GLOBAL_BROADCAST_ROLES)
            )
            if user.role not in LEADER_ROLES and user.role != 'finance_team' and not user.is_staff:
                queryset = queryset.filter(status='published')

        category = self.request.query_params.get('category')
        featured = self.request.query_params.get('featured')
        if category:
            queryset = queryset.filter(category__slug=category)
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset.select_related('church', 'category', 'author').distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only leaders can create news.')

        church = user.church
        if church is None and user.role == 'national_leader':
            church = Church.objects.filter(church_type='national').first()

        if church is None:
            raise PermissionDenied('Your profile must be assigned to a church to create news.')

        serializer.save(author=user, church=church)

    def perform_update(self, serializer):
        item = self.get_object()
        if item.author_id != self.request.user.id:
            raise PermissionDenied('Only the creator can edit this news item.')
        serializer.save(author=item.author, church=item.church)

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.id:
            raise PermissionDenied('Only the creator can delete this news item.')
        instance.delete()

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = AppDepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = Department.objects.filter(
            church__in=get_accessible_churches(self.request.user),
            is_active=True,
        ).select_related('church', 'leader').annotate(member_count=Count('department_members', distinct=True))

        church_id = self.request.query_params.get('church_id')
        search = (self.request.query_params.get('search') or '').strip()
        if church_id:
            queryset = queryset.filter(church_id=church_id)
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by('name')

    def perform_create(self, serializer):
        if self.request.user.role not in LEADER_ROLES:
            raise PermissionDenied('Only leaders can create departments.')

        church = serializer.validated_data.get('church') or self.request.user.church
        if self.request.user.role == 'local_leader':
            if not self.request.user.church_id:
                raise PermissionDenied('Your profile must be assigned to a church.')
            church = self.request.user.church

        if not get_accessible_churches(self.request.user).filter(id=church.id).exists():
            raise PermissionDenied('You are not allowed to manage departments for this church.')

        serializer.save(church=church)

    def perform_update(self, serializer):
        if self.request.user.role not in LEADER_ROLES:
            raise PermissionDenied('Only leaders can edit departments.')

        department = self.get_object()
        church = serializer.validated_data.get('church') or department.church

        if self.request.user.role == 'local_leader':
            if not self.request.user.church_id or department.church_id != self.request.user.church_id:
                raise PermissionDenied('You can only edit departments in your church.')
            church = department.church

        if not get_accessible_churches(self.request.user).filter(id=church.id).exists():
            raise PermissionDenied('You are not allowed to move this department to the selected church.')

        serializer.save(church=church)

    def perform_destroy(self, instance):
        if self.request.user.role not in LEADER_ROLES:
            raise PermissionDenied('Only leaders can delete departments.')

        if self.request.user.role == 'local_leader' and instance.church_id != self.request.user.church_id:
            raise PermissionDenied('You can only delete departments in your church.')

        if not get_accessible_churches(self.request.user).filter(id=instance.church_id).exists():
            raise PermissionDenied('You are not allowed to delete this department.')

        instance.delete()

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        user = request.user
        if user.role != 'local_member':
            return Response({'error': 'Only members can submit department applications.'}, status=status.HTTP_403_FORBIDDEN)

        department = self.get_object()
        if not user.church_id or department.church_id != user.church_id:
            return Response({'error': 'You can only apply to departments in your church.'}, status=status.HTTP_403_FORBIDDEN)

        request_obj, created = DepartmentJoinRequest.objects.get_or_create(
            department=department,
            member=user,
            defaults={'status': 'pending'},
        )

        if not created and request_obj.status == 'approved':
            return Response({'message': 'You are already approved in this department.'})

        if not created:
            request_obj.status = 'pending'
            request_obj.review_notes = ''
            request_obj.reviewed_by = None
            request_obj.reviewed_at = None
            request_obj.save(update_fields=['status', 'review_notes', 'reviewed_by', 'reviewed_at'])

        leaders = User.objects.filter(church=department.church, role__in=LEADER_ROLES, is_active=True)
        for leader in leaders:
            create_notification(
                leader,
                'Department Application',
                f'{user.get_full_name()} applied to join {department.name}.',
                'info',
            )

        return Response(DepartmentJoinRequestSerializer(request_obj).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my-requests')
    def my_requests(self, request):
        queryset = DepartmentJoinRequest.objects.filter(member=request.user).select_related('department', 'department__church', 'reviewed_by')
        serializer = DepartmentJoinRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='join-requests/pending')
    def pending_join_requests(self, request):
        if request.user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to view requests.'}, status=status.HTTP_403_FORBIDDEN)
        queryset = DepartmentJoinRequest.objects.filter(
            status='pending',
            department__church__in=get_accessible_churches(request.user),
        ).select_related('department', 'member', 'department__church')
        serializer = DepartmentJoinRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'join-requests/(?P<request_id>[^/.]+)/approve')
    def approve_join_request(self, request, request_id=None):
        if request.user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to approve requests.'}, status=status.HTTP_403_FORBIDDEN)

        join_request = get_object_or_404(DepartmentJoinRequest, id=request_id)
        if not get_accessible_churches(request.user).filter(id=join_request.department.church_id).exists():
            return Response({'error': 'You cannot approve this request.'}, status=status.HTTP_403_FORBIDDEN)

        join_request.status = 'approved'
        join_request.reviewed_by = request.user
        join_request.reviewed_at = timezone.now()
        join_request.review_notes = (request.data.get('review_notes') or '').strip()
        join_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes'])

        DepartmentMember.objects.get_or_create(
            department=join_request.department,
            member=join_request.member,
            defaults={'role': 'member', 'is_active': True},
        )

        create_notification(
            join_request.member,
            'Department Application Approved',
            f'Your request to join {join_request.department.name} has been approved.',
            'success',
        )

        return Response(DepartmentJoinRequestSerializer(join_request).data)

    @action(detail=False, methods=['post'], url_path=r'join-requests/(?P<request_id>[^/.]+)/reject')
    def reject_join_request(self, request, request_id=None):
        if request.user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to reject requests.'}, status=status.HTTP_403_FORBIDDEN)

        join_request = get_object_or_404(DepartmentJoinRequest, id=request_id)
        if not get_accessible_churches(request.user).filter(id=join_request.department.church_id).exists():
            return Response({'error': 'You cannot reject this request.'}, status=status.HTTP_403_FORBIDDEN)

        review_notes = (request.data.get('review_notes') or '').strip()
        if not review_notes:
            return Response({'error': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        join_request.status = 'rejected'
        join_request.reviewed_by = request.user
        join_request.reviewed_at = timezone.now()
        join_request.review_notes = review_notes
        join_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes'])

        create_notification(
            join_request.member,
            'Department Application Update',
            f'Your request to join {join_request.department.name} was not approved yet.',
            'warning',
        )

        if join_request.member.email:
            send_mail(
                subject='Department Join Request Rejected',
                message=(
                    f"Hello {join_request.member.get_full_name()},\n\n"
                    f"Your request to join {join_request.department.name} has been rejected.\n"
                    f"Reason: {review_notes}\n\n"
                    "Please contact your church leader if you need further clarification."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[join_request.member.email],
                fail_silently=True,
            )

        return Response(DepartmentJoinRequestSerializer(join_request).data)

class GetCurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class UpdateCurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def patch(self, request):
        user = request.user
        allowed_fields = {'full_name', 'email', 'phone', 'neighborhood', 'profile_picture'}
        payload = {key: value for key, value in request.data.items() if key in allowed_fields}

        for key, value in list(payload.items()):
            if isinstance(value, str):
                payload[key] = value.strip()

        if 'email' in payload:
            email_value = payload.get('email')
            if not email_value:
                payload['email'] = None
            else:
                payload['email'] = email_value.lower()

        serializer = UserSerializer(user, data=payload, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user, context={'request': request}).data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password:
            return Response(
                {'detail': 'current_password and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if confirm_password is not None and new_password != confirm_password:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except ValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'})


class MemberDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        target_user = request.user

        # Leaders can view any member's dashboard via ?user_id=X
        user_id = request.query_params.get('user_id')
        if user_id:
            if request.user.role not in LEADER_ROLES:
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            try:
                target_user = User.objects.get(pk=user_id, is_active=True)
            except User.DoesNotExist:
                return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

            accessible_churches = get_accessible_churches(request.user)
            if not target_user.church_id or not accessible_churches.filter(id=target_user.church_id).exists():
                return Response({'detail': 'You cannot view this member dashboard.'}, status=status.HTTP_403_FORBIDDEN)

        church = target_user.church
        if not church:
            return Response({'detail': 'No church assigned to your profile.'}, status=status.HTTP_400_BAD_REQUEST)

        # Keep the requested fixed department list available per church.
        normalized_names = [name.lower() for name in MEMBER_DASHBOARD_DEPARTMENTS]
        existing_departments = Department.objects.filter(church=church, is_active=True)
        existing_map = {dept.name.lower(): dept for dept in existing_departments}
        for dept_name in MEMBER_DASHBOARD_DEPARTMENTS:
            key = dept_name.lower()
            if key not in existing_map:
                existing_map[key] = Department.objects.create(name=dept_name, church=church, is_active=True)

        departments = [existing_map[name.lower()] for name in MEMBER_DASHBOARD_DEPARTMENTS if name.lower() in existing_map]
        department_ids = [dept.id for dept in departments]

        member_requests = {
            req.department_id: req
            for req in DepartmentJoinRequest.objects.filter(member=target_user, department_id__in=department_ids)
        }
        approved_department_ids = set(
            DepartmentMember.objects.filter(member=target_user, department_id__in=department_ids, is_active=True).values_list('department_id', flat=True)
        )

        now = timezone.now()
        target_scope = get_accessible_churches(target_user)
        member_events = Event.objects.filter(
            is_active=True,
        ).filter(
            Q(church__in=target_scope)
            | Q(created_by__role__in=GLOBAL_BROADCAST_ROLES)
        ).select_related('created_by', 'church').distinct()

        upcoming_events_qs = member_events.filter(
            Q(end_date__gte=now) | Q(end_date__isnull=True, start_date__gte=now)
        ).order_by('start_date')
        past_events_qs = member_events.filter(
            Q(end_date__lt=now) | Q(end_date__isnull=True, start_date__lt=now)
        ).order_by('-start_date')

        event_registration_map = {
            reg.event_id: reg.status
            for reg in EventRegistration.objects.filter(member=target_user)
        }

        pastor = User.objects.filter(
            role='local_leader',
            church_id=church.id,
            is_active=True,
        ).order_by('created_at').first()

        offerings_qs = Offering.objects.filter(
            member=target_user,
            church=church,
        ).order_by('-payment_date', '-created_at')

        offering_totals = offerings_qs.filter(
            offering_type__in=['tithe', 'offering', 'building', 'mission']
        ).values('offering_type').annotate(total=Sum('amount'))
        offering_summary = {'tithe': 0.0, 'offering': 0.0, 'building': 0.0, 'mission': 0.0}
        for row in offering_totals:
            offering_summary[row['offering_type']] = _safe_amount(row['total'])

        activities = [
            {
                'type': 'registration',
                'title': 'Church Registration',
                'description': f'Registered at {church.name}',
                'created_at': target_user.created_at,
            }
        ]

        for prayer in PrayerRequest.objects.filter(member=target_user).order_by('-created_at')[:50]:
            activities.append(
                {
                    'type': 'prayer',
                    'title': 'Prayer Request',
                    'description': prayer.request,
                    'created_at': prayer.created_at,
                }
            )

        for registration in EventRegistration.objects.filter(member=target_user).select_related('event').order_by('-registered_at')[:50]:
            activities.append(
                {
                    'type': 'event',
                    'title': 'Event Registration',
                    'description': registration.event.title,
                    'created_at': registration.registered_at,
                }
            )

        for join_request in DepartmentJoinRequest.objects.filter(member=target_user).select_related('department').order_by('-requested_at')[:50]:
            activities.append(
                {
                    'type': 'department',
                    'title': 'Department Application',
                    'description': f"{join_request.department.name} ({join_request.status})",
                    'created_at': join_request.requested_at,
                }
            )

        for offering in offerings_qs[:100]:
            activities.append(
                {
                    'type': 'offering',
                    'title': 'Offering Contribution',
                    'description': f"{offering.get_offering_type_display()} - {offering.amount}",
                    'created_at': offering.created_at,
                }
            )

        def _normalize_dt(dt):
            if timezone.is_naive(dt):
                return timezone.make_aware(dt)
            return dt

        activities = sorted(
            [item for item in activities if item.get('created_at')],
            key=lambda item: _normalize_dt(item['created_at']),
            reverse=True,
        )[:200]

        payload = {
            'member': {
                'id': target_user.id,
                'full_name': target_user.get_full_name(),
                'username': target_user.username,
                'email': target_user.email,
                'phone': target_user.phone,
            },
            'church': {
                'id': church.id,
                'name': church.name,
                'church_type': church.church_type,
            },
            'pastor': {
                'name': pastor.get_full_name() if pastor else '',
                'email': pastor.email if pastor else '',
                'phone': pastor.phone if pastor else '',
            },
            'departments': [
                {
                    'id': dept.id,
                    'name': dept.name,
                    'description': dept.description,
                    'leader_name': dept.leader.full_name if dept.leader else '',
                    'status': (
                        'approved'
                        if dept.id in approved_department_ids
                        else (member_requests[dept.id].status if dept.id in member_requests else 'not_applied')
                    ),
                    'request_id': member_requests[dept.id].id if dept.id in member_requests else None,
                    'review_notes': member_requests[dept.id].review_notes if dept.id in member_requests else '',
                }
                for dept in departments
            ],
            'events': {
                'upcoming': [
                    {
                        'id': event.id,
                        'title': event.title,
                        'description': event.description,
                        'start_date': event.start_date,
                        'end_date': event.end_date,
                        'venue': event.venue,
                        'registration_required': event.registration_required,
                        'registration_status': event_registration_map.get(event.id),
                        'images': event.images or [],
                    }
                    for event in upcoming_events_qs[:20]
                ],
                'past': [
                    {
                        'id': event.id,
                        'title': event.title,
                        'description': event.description,
                        'start_date': event.start_date,
                        'end_date': event.end_date,
                        'venue': event.venue,
                        'registration_status': event_registration_map.get(event.id),
                        'images': event.images or [],
                    }
                    for event in past_events_qs[:20]
                ],
            },
            'prayers': [
                {
                    'id': prayer.id,
                    'request': prayer.request,
                    'status': prayer.status,
                    'created_at': prayer.created_at,
                }
                for prayer in PrayerRequest.objects.filter(member=target_user).order_by('-created_at')[:10]
            ],
            'offerings': [
                {
                    'id': offering.id,
                    'offering_type': offering.offering_type,
                    'offering_type_display': offering.get_offering_type_display(),
                    'amount': offering.amount,
                    'payment_method': offering.payment_method,
                    'payment_date': offering.payment_date,
                    'receipt_no': offering.receipt_no,
                    'created_at': offering.created_at,
                }
                for offering in offerings_qs[:100]
            ],
            'offering_summary': offering_summary,
            'activities': activities,
        }
        return Response(payload)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
            try:
                from apps.api.tasks import send_password_reset_email_task
                send_password_reset_email_task.delay(user.id, reset_link)
            except Exception:
                # Fallback to synchronous send if Celery is unavailable
                send_mail(
                    subject='CFCT Password Reset Request',
                    message=(
                        'You requested a password reset.\n\n'
                        f'Use the link below to set a new password:\n{reset_link}\n\n'
                        'If you did not request this, please ignore this message.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )

        # Never reveal whether an account exists for the email.
        return Response({'detail': 'If that email exists, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not uid or not token or not new_password:
            return Response(
                {'detail': 'uid, token and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except ValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successful.'})


class RegisterMemberView(APIView):
    """Public endpoint for new member self-registration."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')
        full_name = (request.data.get('full_name') or '').strip()
        phone = (request.data.get('phone') or '').strip()
        church_id = request.data.get('church_id')

        if not username:
            return Response({'detail': 'username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({'detail': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'detail': 'password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'detail': 'Username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'An account with that email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except ValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        church = None
        if church_id:
            try:
                church = Church.objects.get(id=church_id, church_type='local')
            except Church.DoesNotExist:
                return Response({'detail': 'Invalid church_id. Must be an existing local church.'}, status=status.HTTP_400_BAD_REQUEST)

        verification_token = _uuid_module.uuid4()
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            role='local_member',
            church=church,
            is_active=False,
            is_approved=False,
            email_verified=False,
            email_verification_token=verification_token,
            email_verification_sent_at=timezone.now(),
        )

        verify_url = (
            f"{settings.FRONTEND_BASE_URL.rstrip('/')}/verify-email?token={verification_token}"
        )
        try:
            from apps.api.tasks import send_verification_email_task
            send_verification_email_task.delay(user.id, verify_url)
        except Exception:
            send_mail(
                subject='Verify your CFCT account email',
                message=(
                    f"Hello {user.get_full_name()},\n\n"
                    f"Please verify your email address by clicking the link below:\n{verify_url}\n\n"
                    "This link expires in 24 hours."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )

        return Response(
            {
                'detail': 'Registration successful. Please check your email to verify your account.',
                'username': user.username,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    """Verify a user's email address using the token sent during registration."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = (request.query_params.get('token') or '').strip()
        if not token:
            return Response({'detail': 'token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token_uuid = _uuid_module.UUID(token)
        except ValueError:
            return Response({'detail': 'Invalid token format.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email_verification_token=token_uuid).first()
        if not user:
            return Response({'detail': 'Invalid or already-used verification token.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.email_verified:
            return Response({'detail': 'Email is already verified.'})

        timeout = getattr(settings, 'EMAIL_VERIFICATION_TIMEOUT', 86400)
        if user.email_verification_sent_at:
            elapsed = (timezone.now() - user.email_verification_sent_at).total_seconds()
            if elapsed > timeout:
                return Response({'detail': 'Verification link has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.email_verification_token = None
        user.save(update_fields=['email_verified', 'email_verification_token'])

        return Response({'detail': 'Email verified successfully. Your account is pending approval by a church leader.'})


class ResendVerificationEmailView(APIView):
    """Resend the email verification link for a registered but unverified account."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, email_verified=False).first()
        # Always return success to avoid account enumeration
        if user and user.email:
            new_token = _uuid_module.uuid4()
            user.email_verification_token = new_token
            user.email_verification_sent_at = timezone.now()
            user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])

            verify_url = (
                f"{settings.FRONTEND_BASE_URL.rstrip('/')}/verify-email?token={new_token}"
            )
            try:
                from apps.api.tasks import send_verification_email_task
                send_verification_email_task.delay(user.id, verify_url)
            except Exception:
                send_mail(
                    subject='Verify your CFCT account email',
                    message=(
                        f"Hello {user.get_full_name()},\n\n"
                        f"Please verify your email address:\n{verify_url}\n\n"
                        "This link expires in 24 hours."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )

        return Response({'detail': 'If that email is registered and unverified, a new verification link has been sent.'})


class PopupNewsView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    
    def get_queryset(self):
        now = timezone.now()
        return Event.objects.filter(
            is_popup_news=True,
            is_active=True,
            created_by__role__in=GLOBAL_BROADCAST_ROLES,
        ).filter(
            Q(popup_start_date__isnull=True) | Q(popup_start_date__lte=now),
            Q(popup_end_date__isnull=True) | Q(popup_end_date__gte=now),
        ).select_related('church')[:10]

class LatestNewsView(generics.ListAPIView):
    serializer_class = AppNewsSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    
    def get_queryset(self):
        return News.objects.filter(
            status='published',
            author__role__in=GLOBAL_BROADCAST_ROLES,
        ).select_related('church', 'category', 'author')[:10]

class PendingRegistrationsView(generics.ListAPIView):
    """
    Get pending member registrations that need approval.
    Supports pagination and filtering by status.
    """
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    pagination_class = PageNumberPagination
    
    def get_queryset(self):
        user = self.request.user
        churches = get_accessible_churches(user)
        
        # Return registrations so frontend receives nested registration fields
        # (personal_info, guardian_info, spiritual_info) and registration IDs.
        registrations = MemberRegistration.objects.filter(
            church__in=churches
        ).select_related('user', 'church', 'approved_by')
        
        # Filter by status (default: pending)
        status_filter = self.request.query_params.get('status', 'pending')
        if status_filter:
            registrations = registrations.filter(status=status_filter)
        
        return registrations.order_by('-created_at')

class AuditLogsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def _ensure_national_leader(self, request):
        if request.user.role != 'national_leader':
            return Response({'error': 'Only national leaders can manage audit logs'}, status=status.HTTP_403_FORBIDDEN)
        return None
    
    def get(self, request):
        permission_error = self._ensure_national_leader(request)
        if permission_error:
            return permission_error

        logs = LogEntry.objects.select_related('user', 'content_type').order_by('-action_time')

        action_filter = (request.query_params.get('action') or '').upper()
        action_flag_map = {'CREATE': 1, 'UPDATE': 2, 'DELETE': 3}
        if action_filter in action_flag_map:
            logs = logs.filter(action_flag=action_flag_map[action_filter])

        search = (request.query_params.get('search') or '').strip()
        if search:
            logs = logs.filter(
                Q(object_repr__icontains=search)
                | Q(content_type__model__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )

        try:
            limit = int(request.query_params.get('limit', 100))
        except (TypeError, ValueError):
            limit = 100
        limit = min(max(limit, 1), 500)

        action_map = {1: 'CREATE', 2: 'UPDATE', 3: 'DELETE'}
        data = [
            {
                'id': log.id,
                'username': (
                    (log.user.get_full_name().strip() if log.user and hasattr(log.user, 'get_full_name') else '')
                    or (log.user.username if log.user else 'System')
                ),
                'action': action_map.get(log.action_flag, 'UNKNOWN'),
                'table_name': log.content_type.model if log.content_type else '',
                'object_repr': log.object_repr,
                'change_message': log.get_change_message() or log.change_message,
                'created_at': log.action_time,
            }
            for log in logs[:limit]
        ]
        return Response(data)

    def delete(self, request):
        permission_error = self._ensure_national_leader(request)
        if permission_error:
            return permission_error

        raw_ids = request.data.get('ids')
        if not isinstance(raw_ids, list) or not raw_ids:
            return Response({'error': 'Provide a non-empty ids array.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            log_ids = [int(log_id) for log_id in raw_ids]
        except (TypeError, ValueError):
            return Response({'error': 'Audit log ids must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        logs = LogEntry.objects.filter(id__in=log_ids)
        deleted_count = logs.count()
        if deleted_count == 0:
            return Response({'error': 'No audit logs matched the selected ids.'}, status=status.HTTP_404_NOT_FOUND)

        logs.delete()
        return Response(
            {
                'message': f'{deleted_count} audit log(s) deleted successfully.',
                'deleted_count': deleted_count,
            }
        )

class MonthlySummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        churches = get_accessible_churches(request.user)
        offerings = Offering.objects.filter(church__in=churches)

        monthly_income = []
        monthly_totals = {}
        for offering in offerings:
            month_key = offering.payment_date.strftime('%b %Y')
            monthly_totals[month_key] = monthly_totals.get(month_key, 0) + float(offering.amount)

        for month, amount in monthly_totals.items():
            monthly_income.append({'month': month, 'amount': amount})

        offerings_by_type = [
            {'type': row['offering_type'], 'amount': float(row['amount'] or 0)}
            for row in offerings.values('offering_type').annotate(amount=Sum('amount')).order_by('offering_type')
        ]

        return Response({
            'monthly_income': monthly_income,
            'offerings_by_type': offerings_by_type,
            'total_income': sum(item['amount'] for item in monthly_income),
        })

class ChurchComparisonView(APIView):
    """Compare churches within the accessible scope (district and above). Returns per-church stats.
    
    Query params:
      - district_id: filter to local churches in a specific district
      - group_by=district: group local churches by their parent district (useful for regional view)
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader']:
            return Response({'error': 'Only district leaders and above can view church comparison reports.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        now = timezone.now()

        # Optional district filter
        district_id = request.query_params.get('district_id')
        group_by = (request.query_params.get('group_by') or '').strip().lower()
        region_id = request.query_params.get('region_id')

        local_churches = accessible_churches.filter(church_type='local')

        if district_id:
            local_churches = local_churches.filter(parent_church_id=district_id)
        elif region_id:
            local_churches = local_churches.filter(parent_church__parent_church_id=region_id)

        def _church_stats(church):
            members_count = User.objects.filter(church=church, role__in=['local_member', 'local_leader']).count()
            offerings_total = _safe_amount(
                Offering.objects.filter(church=church).aggregate(total=Sum('amount'))['total']
            )
            events_count = Event.objects.filter(church=church, is_active=True).filter(
                Q(end_date__gte=now) | Q(end_date__isnull=True, start_date__gte=now)
            ).count()
            departments_count = Department.objects.filter(church=church, is_active=True).count()
            pending_registrations = MemberRegistration.objects.filter(church=church, status='pending').count()
            pastor = User.objects.filter(church=church, role='local_leader', is_active=True).order_by('created_at').first()
            return {
                'church_id': church.id,
                'church_name': church.name,
                'district_id': church.parent_church_id,
                'district_name': church.parent_church.name if church.parent_church else '',
                'members_count': members_count,
                'offerings_total': offerings_total,
                'events_count': events_count,
                'departments_count': departments_count,
                'pending_registrations': pending_registrations,
                'pastor_name': pastor.get_full_name() if pastor else '',
                'pastor_email': pastor.email if pastor else '',
                'pastor_phone': pastor.phone if pastor else '',
            }

        comparison_data = [_church_stats(c) for c in local_churches.select_related('parent_church').order_by('name')]

        if group_by == 'district':
            # Group results by district
            districts_map = {}
            for entry in comparison_data:
                dist_id = entry['district_id']
                if dist_id not in districts_map:
                    districts_map[dist_id] = {
                        'district_id': dist_id,
                        'district_name': entry['district_name'],
                        'churches': [],
                        'total_members': 0,
                        'total_offerings': 0.0,
                    }
                    # Add district leader info
                    dl = User.objects.filter(church_id=dist_id, role='district_leader', is_active=True).first()
                    districts_map[dist_id]['district_leader_name'] = dl.get_full_name() if dl else ''
                    districts_map[dist_id]['district_leader_email'] = dl.email if dl else ''
                    districts_map[dist_id]['district_leader_phone'] = dl.phone if dl else ''
                districts_map[dist_id]['churches'].append(entry)
                districts_map[dist_id]['total_members'] += entry['members_count']
                districts_map[dist_id]['total_offerings'] += entry['offerings_total']

            return Response({
                'grouped_by': 'district',
                'districts': list(districts_map.values()),
                'total_churches': len(comparison_data),
                'total_members': sum(c['members_count'] for c in comparison_data),
                'total_offerings': sum(c['offerings_total'] for c in comparison_data),
            })

        return Response({
            'churches': comparison_data,
            'total_churches': len(comparison_data),
            'total_members': sum(c['members_count'] for c in comparison_data),
            'total_offerings': sum(c['offerings_total'] for c in comparison_data),
        })


class ResourceRequestView(APIView):
    """District leaders request resources from the regional level above them."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        user = request.user
        if user.role not in ['district_leader', 'regional_leader', 'zone_leader']:
            return Response({'error': 'Only district leaders and above can submit resource requests.'}, status=status.HTTP_403_FORBIDDEN)

        if not user.church:
            return Response({'error': 'Your profile must be assigned to a church.'}, status=status.HTTP_400_BAD_REQUEST)

        title = (request.data.get('title') or '').strip()
        message = (request.data.get('message') or '').strip()
        if not title or not message:
            return Response({'error': 'title and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        parent_church = user.church.parent_church
        if not parent_church:
            return Response({'error': 'No parent church found for your church.'}, status=status.HTTP_400_BAD_REQUEST)

        parent_role_map = {
            'district_leader': 'regional_leader',
            'regional_leader': 'zone_leader',
            'zone_leader': 'national_leader',
        }
        parent_leader_role = parent_role_map.get(user.role, 'national_leader')
        parent_leaders = User.objects.filter(church=parent_church, role=parent_leader_role, is_active=True)
        if not parent_leaders.exists():
            parent_leaders = User.objects.filter(role='national_leader', is_active=True)

        notification_body = (
            f'Resource request from {user.get_full_name()} ({user.church.name}):\n{message}'
        )
        count = 0
        for leader in parent_leaders:
            create_notification(leader, f'Resource Request: {title}', notification_body, 'info')
            count += 1

        return Response({
            'message': f'Resource request sent to {count} leader(s) at the next level.',
            'count': count,
        })


class DistrictComparisonView(APIView):
    """Compare districts within a region (regional leader and above).\n    Returns per-district aggregated stats for member growth, offerings, events, transfers.\n    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader']:
            return Response({'error': 'Only regional leaders and above can view district comparison reports.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        districts = accessible_churches.filter(church_type='district')

        region_id = request.query_params.get('region_id')
        if region_id:
            districts = districts.filter(parent_church_id=region_id)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        comparison_data = []
        for district in districts.order_by('name'):
            local_churches = Church.objects.filter(parent_church=district, church_type='local')
            local_ids = list(local_churches.values_list('id', flat=True))
            all_church_ids = [district.id] + local_ids

            members_count = User.objects.filter(church_id__in=all_church_ids, role__in=['local_member', 'local_leader']).count()
            new_members_this_month = User.objects.filter(
                church_id__in=all_church_ids,
                role__in=['local_member', 'local_leader'],
                created_at__gte=month_start,
            ).count()
            offerings_total = _safe_amount(
                Offering.objects.filter(church_id__in=all_church_ids).aggregate(total=Sum('amount'))['total']
            )
            events_count = Event.objects.filter(church_id__in=all_church_ids, is_active=True).count()
            pending_registrations = MemberRegistration.objects.filter(church_id__in=all_church_ids, status='pending').count()
            transfers_count = Transfer.objects.filter(
                Q(from_church_id__in=all_church_ids) | Q(to_church_id__in=all_church_ids)
            ).count()
            local_churches_count = len(local_ids)
            dl = User.objects.filter(church=district, role='district_leader', is_active=True).order_by('created_at').first()

            comparison_data.append({
                'district_id': district.id,
                'district_name': district.name,
                'local_churches_count': local_churches_count,
                'members_count': members_count,
                'new_members_this_month': new_members_this_month,
                'offerings_total': offerings_total,
                'events_count': events_count,
                'pending_registrations': pending_registrations,
                'transfers_count': transfers_count,
                'district_leader_name': dl.get_full_name() if dl else '',
                'district_leader_email': dl.email if dl else '',
                'district_leader_phone': dl.phone if dl else '',
            })

        return Response({
            'districts': comparison_data,
            'total_districts': len(comparison_data),
            'total_members': sum(d['members_count'] for d in comparison_data),
            'total_offerings': sum(d['offerings_total'] for d in comparison_data),
            'total_local_churches': sum(d['local_churches_count'] for d in comparison_data),
        })


class RegionComparisonView(APIView):
    """Compare regions within a zone (zone leader and above)."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can view region comparison reports.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        regions = accessible_churches.filter(church_type='region')

        zone_id = request.query_params.get('zone_id')
        if zone_id:
            regions = regions.filter(parent_church_id=zone_id)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_key_totals = {}
        comparison_data = []

        for region in regions.order_by('name'):
            region_churches = Church.objects.filter(
                Q(id=region.id) | Q(parent_church=region) | Q(parent_church__parent_church=region)
            )
            district_count = region_churches.filter(church_type='district').count()
            local_count = region_churches.filter(church_type='local').count()

            members_count = User.objects.filter(church__in=region_churches, role__in=['local_member', 'local_leader']).count()
            new_members_this_month = User.objects.filter(
                church__in=region_churches,
                role__in=['local_member', 'local_leader'],
                created_at__gte=month_start,
            ).count()
            offerings_total = _safe_amount(Offering.objects.filter(church__in=region_churches).aggregate(total=Sum('amount'))['total'])
            events_count = Event.objects.filter(church__in=region_churches, is_active=True).count()
            pending_registrations = MemberRegistration.objects.filter(church__in=region_churches, status='pending').count()
            transfers_count = Transfer.objects.filter(
                Q(from_church__in=region_churches) | Q(to_church__in=region_churches)
            ).count()

            regional_leader = User.objects.filter(church=region, role='regional_leader', is_active=True).order_by('created_at').first()
            district_leaders = User.objects.filter(church__in=region_churches.filter(church_type='district'), role='district_leader', is_active=True).count()
            pastors = User.objects.filter(church__in=region_churches.filter(church_type='local'), role='local_leader', is_active=True).count()

            monthly_rows = Offering.objects.filter(church__in=region_churches).values('payment_date__year', 'payment_date__month').annotate(total=Sum('amount'))
            for row in monthly_rows:
                year = row['payment_date__year']
                month = row['payment_date__month']
                if year and month:
                    key = f'{year}-{month:02d}'
                    month_key_totals[key] = month_key_totals.get(key, 0.0) + _safe_amount(row['total'])

            comparison_data.append({
                'region_id': region.id,
                'region_name': region.name,
                'districts_count': district_count,
                'locals_count': local_count,
                'members_count': members_count,
                'new_members_this_month': new_members_this_month,
                'offerings_total': offerings_total,
                'events_count': events_count,
                'pending_registrations': pending_registrations,
                'transfers_count': transfers_count,
                'regional_leader_name': regional_leader.get_full_name() if regional_leader else '',
                'regional_leader_email': regional_leader.email if regional_leader else '',
                'regional_leader_phone': regional_leader.phone if regional_leader else '',
                'district_leaders_count': district_leaders,
                'pastors_count': pastors,
            })

        return Response({
            'regions': comparison_data,
            'monthly_financial_trends': [{'month': k, 'total': v} for k, v in sorted(month_key_totals.items())],
            'total_regions': len(comparison_data),
            'total_members': sum(r['members_count'] for r in comparison_data),
            'total_offerings': sum(r['offerings_total'] for r in comparison_data),
            'total_districts': sum(r['districts_count'] for r in comparison_data),
            'total_locals': sum(r['locals_count'] for r in comparison_data),
        })


class ZoneFinancialSummaryView(APIView):
    """Zone-wide financial summary and trends (zone leader and above)."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can view zone financial summaries.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        zone_id = request.query_params.get('zone_id')
        if zone_id:
            scoped_churches = accessible_churches.filter(
                Q(id=zone_id)
                | Q(parent_church_id=zone_id)
                | Q(parent_church__parent_church_id=zone_id)
                | Q(parent_church__parent_church__parent_church_id=zone_id)
            )
        else:
            scoped_churches = accessible_churches

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        offerings = Offering.objects.filter(church__in=scoped_churches)
        if start_date:
            offerings = offerings.filter(payment_date__gte=start_date)
        if end_date:
            offerings = offerings.filter(payment_date__lte=end_date)

        by_type = [
            {'type': row['offering_type'], 'total': _safe_amount(row['total'])}
            for row in offerings.values('offering_type').annotate(total=Sum('amount')).order_by('offering_type')
        ]

        month_totals = {}
        for row in offerings.values('payment_date__year', 'payment_date__month').annotate(total=Sum('amount')).order_by('payment_date__year', 'payment_date__month'):
            year = row['payment_date__year']
            month = row['payment_date__month']
            if year and month:
                key = f'{year}-{month:02d}'
                month_totals[key] = _safe_amount(row['total'])

        region_breakdown = []
        for region in scoped_churches.filter(church_type='region').order_by('name'):
            region_scope = Church.objects.filter(
                Q(id=region.id) | Q(parent_church=region) | Q(parent_church__parent_church=region)
            )
            region_total = _safe_amount(offerings.filter(church__in=region_scope).aggregate(total=Sum('amount'))['total'])
            region_breakdown.append({'region_id': region.id, 'region_name': region.name, 'total_offerings': region_total})

        grand_total = _safe_amount(offerings.aggregate(total=Sum('amount'))['total'])

        return Response({
            'grand_total': grand_total,
            'by_type': by_type,
            'by_region': region_breakdown,
            'monthly': [{'month': key, 'total': month_totals[key]} for key in sorted(month_totals.keys())],
        })


class ZoneBudgetAllocationView(APIView):
    """Suggested zone budget allocation by region based on recent offerings and member share."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader']:
            return Response({'error': 'Only zone leaders and above can view budget allocations.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        zone_id = request.query_params.get('zone_id')
        if zone_id:
            scoped = accessible_churches.filter(
                Q(id=zone_id)
                | Q(parent_church_id=zone_id)
                | Q(parent_church__parent_church_id=zone_id)
                | Q(parent_church__parent_church__parent_church_id=zone_id)
            )
        else:
            scoped = accessible_churches

        try:
            total_budget = float(request.query_params.get('total_budget', 0) or 0)
        except (TypeError, ValueError):
            total_budget = 0.0

        regions = scoped.filter(church_type='region').order_by('name')
        rows = []
        total_members = 0
        total_offerings = 0.0

        for region in regions:
            region_scope = Church.objects.filter(
                Q(id=region.id) | Q(parent_church=region) | Q(parent_church__parent_church=region)
            )
            members = User.objects.filter(church__in=region_scope, role__in=['local_member', 'local_leader']).count()
            offerings_total = _safe_amount(Offering.objects.filter(church__in=region_scope).aggregate(total=Sum('amount'))['total'])
            rows.append({
                'region_id': region.id,
                'region_name': region.name,
                'members': members,
                'offerings_total': offerings_total,
            })
            total_members += members
            total_offerings += offerings_total

        for row in rows:
            member_share = (row['members'] / total_members) if total_members else 0
            offering_share = (row['offerings_total'] / total_offerings) if total_offerings else 0
            weighted_share = (member_share * 0.5) + (offering_share * 0.5)
            row['member_share'] = round(member_share * 100, 2)
            row['offering_share'] = round(offering_share * 100, 2)
            row['recommended_share'] = round(weighted_share * 100, 2)
            row['recommended_allocation'] = round(total_budget * weighted_share, 2) if total_budget > 0 else 0.0

        return Response({
            'total_budget': total_budget,
            'regions': rows,
            'total_members': total_members,
            'total_offerings': total_offerings,
            'allocation_formula': '50% member share + 50% offering share',
        })


class TransferStatsView(APIView):
    """Transfer statistics scoped to the requester's accessible churches."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'Only leaders can view transfer statistics.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        qs = Transfer.objects.filter(
            Q(from_church__in=accessible_churches) | Q(to_church__in=accessible_churches)
        )

        region_id = request.query_params.get('region_id')
        district_id = request.query_params.get('district_id')
        if district_id:
            district_churches = Church.objects.filter(
                Q(id=district_id) | Q(parent_church_id=district_id)
            )
            qs = qs.filter(
                Q(from_church__in=district_churches) | Q(to_church__in=district_churches)
            )
        elif region_id:
            region_churches = Church.objects.filter(
                Q(id=region_id) | Q(parent_church_id=region_id) | Q(parent_church__parent_church_id=region_id)
            )
            qs = qs.filter(
                Q(from_church__in=region_churches) | Q(to_church__in=region_churches)
            )

        total = qs.count()
        pending = qs.filter(status='pending').count()
        approved = qs.filter(status='approved').count()
        rejected = qs.filter(status='rejected').count()

        # Inbound vs outbound for accessible scope
        inbound = qs.filter(to_church__in=accessible_churches).count()
        outbound = qs.filter(from_church__in=accessible_churches).count()

        return Response({
            'total': total,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'inbound': inbound,
            'outbound': outbound,
        })


class RegionalFinancialReportView(APIView):
    """Detailed financial report for a region — breakdowns by district, church, and offering type."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader']:
            return Response({'error': 'Only regional leaders and above can view regional financial reports.'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)

        region_id = request.query_params.get('region_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if region_id:
            scoped_churches = accessible_churches.filter(
                Q(id=region_id) | Q(parent_church_id=region_id) | Q(parent_church__parent_church_id=region_id)
            )
        else:
            scoped_churches = accessible_churches

        offerings_qs = Offering.objects.filter(church__in=scoped_churches)
        if start_date:
            offerings_qs = offerings_qs.filter(payment_date__gte=start_date)
        if end_date:
            offerings_qs = offerings_qs.filter(payment_date__lte=end_date)

        # Total by offering type
        by_type = [
            {'type': row['offering_type'], 'total': _safe_amount(row['total'])}
            for row in offerings_qs.values('offering_type').annotate(total=Sum('amount')).order_by('offering_type')
        ]

        # By district
        districts = scoped_churches.filter(church_type='district')
        by_district = []
        for district in districts.order_by('name'):
            local_church_ids = list(Church.objects.filter(parent_church=district, church_type='local').values_list('id', flat=True))
            district_offering = _safe_amount(
                offerings_qs.filter(church_id__in=[district.id] + local_church_ids).aggregate(total=Sum('amount'))['total']
            )
            by_district.append({
                'district_id': district.id,
                'district_name': district.name,
                'total_offerings': district_offering,
            })

        # Monthly breakdown
        monthly = {}
        for row in offerings_qs.values('payment_date__year', 'payment_date__month').annotate(total=Sum('amount')).order_by('payment_date__year', 'payment_date__month'):
            year = row['payment_date__year']
            month = row['payment_date__month']
            if year and month:
                key = f'{year}-{month:02d}'
                monthly[key] = _safe_amount(row['total'])

        grand_total = _safe_amount(offerings_qs.aggregate(total=Sum('amount'))['total'])

        return Response({
            'grand_total': grand_total,
            'by_type': by_type,
            'by_district': by_district,
            'monthly': [{'month': k, 'total': v} for k, v in sorted(monthly.items())],
        })


class ZoneComparisonView(APIView):
    """Compare all zones nationally. National leader only."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can view zone comparison reports.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        zones = Church.objects.filter(church_type='zone').order_by('name')
        comparison_data = []

        for zone in zones:
            zone_scope = Church.objects.filter(
                Q(id=zone.id) | Q(parent_church=zone)
                | Q(parent_church__parent_church=zone)
                | Q(parent_church__parent_church__parent_church=zone)
            )
            regions_count = Church.objects.filter(parent_church=zone, church_type='region').count()
            districts_count = Church.objects.filter(parent_church__parent_church=zone, church_type='district').count()
            locals_count = Church.objects.filter(parent_church__parent_church__parent_church=zone, church_type='local').count()
            members_count = User.objects.filter(church__in=zone_scope, role__in=['local_member', 'local_leader']).count()
            new_members = User.objects.filter(church__in=zone_scope, role__in=['local_member', 'local_leader'], created_at__gte=month_start).count()
            offerings_total = _safe_amount(Offering.objects.filter(church__in=zone_scope).aggregate(total=Sum('amount'))['total'])
            events_count = Event.objects.filter(church__in=zone_scope, is_active=True).count()
            pending_registrations = MemberRegistration.objects.filter(church__in=zone_scope, status='pending').count()
            zone_leader = User.objects.filter(church=zone, role='zone_leader', is_active=True).order_by('created_at').first()

            comparison_data.append({
                'zone_id': zone.id,
                'zone_name': zone.name,
                'regions_count': regions_count,
                'districts_count': districts_count,
                'locals_count': locals_count,
                'members_count': members_count,
                'new_members_this_month': new_members,
                'offerings_total': offerings_total,
                'events_count': events_count,
                'pending_registrations': pending_registrations,
                'zone_leader_name': zone_leader.get_full_name() if zone_leader else '',
                'zone_leader_email': zone_leader.email if zone_leader else '',
            })

        return Response({
            'zones': comparison_data,
            'total_zones': len(comparison_data),
            'total_members': sum(z['members_count'] for z in comparison_data),
            'total_offerings': sum(z['offerings_total'] for z in comparison_data),
            'total_regions': sum(z['regions_count'] for z in comparison_data),
            'total_districts': sum(z['districts_count'] for z in comparison_data),
            'total_locals': sum(z['locals_count'] for z in comparison_data),
        })


class NationalFinancialReportView(APIView):
    """National-level financial summary broken down by zone. National leader only."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can view national financial reports.'}, status=status.HTTP_403_FORBIDDEN)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        offerings_qs = Offering.objects.all()
        if start_date:
            offerings_qs = offerings_qs.filter(payment_date__gte=start_date)
        if end_date:
            offerings_qs = offerings_qs.filter(payment_date__lte=end_date)

        grand_total = _safe_amount(offerings_qs.aggregate(total=Sum('amount'))['total'])

        by_type = [
            {'type': row['offering_type'], 'total': _safe_amount(row['total'])}
            for row in offerings_qs.values('offering_type').annotate(total=Sum('amount')).order_by('offering_type')
        ]

        monthly = {}
        for row in offerings_qs.values('payment_date__year', 'payment_date__month').annotate(total=Sum('amount')).order_by('payment_date__year', 'payment_date__month'):
            year = row['payment_date__year']
            month = row['payment_date__month']
            if year and month:
                key = f'{year}-{month:02d}'
                monthly[key] = _safe_amount(row['total'])

        by_zone = []
        for zone in Church.objects.filter(church_type='zone').order_by('name'):
            zone_scope = Church.objects.filter(
                Q(id=zone.id) | Q(parent_church=zone)
                | Q(parent_church__parent_church=zone)
                | Q(parent_church__parent_church__parent_church=zone)
            )
            zone_total = _safe_amount(offerings_qs.filter(church__in=zone_scope).aggregate(total=Sum('amount'))['total'])
            by_zone.append({'zone_id': zone.id, 'zone_name': zone.name, 'total_offerings': zone_total})

        # Simple linear forecast (average of last 3 months * next month)
        monthly_sorted = [v for _, v in sorted(monthly.items())]
        avg_last_3 = sum(monthly_sorted[-3:]) / 3 if len(monthly_sorted) >= 3 else grand_total / max(len(monthly_sorted), 1)
        forecast_next_month = round(avg_last_3, 2)

        return Response({
            'grand_total': grand_total,
            'by_type': by_type,
            'by_zone': by_zone,
            'monthly': [{'month': k, 'total': monthly[k]} for k in sorted(monthly.keys())],
            'forecast_next_month': forecast_next_month,
        })


class NationalBudgetAllocationView(APIView):
    """National budget allocation suggested across zones. National leader only."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role != 'national_leader':
            return Response({'error': 'Only national leaders can view national budget allocations.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            total_budget = float(request.query_params.get('total_budget', 0) or 0)
        except (TypeError, ValueError):
            total_budget = 0.0

        zones = Church.objects.filter(church_type='zone').order_by('name')
        rows = []
        total_members = 0
        total_offerings = 0.0

        for zone in zones:
            zone_scope = Church.objects.filter(
                Q(id=zone.id) | Q(parent_church=zone)
                | Q(parent_church__parent_church=zone)
                | Q(parent_church__parent_church__parent_church=zone)
            )
            members = User.objects.filter(church__in=zone_scope, role__in=['local_member', 'local_leader']).count()
            offerings_total = _safe_amount(Offering.objects.filter(church__in=zone_scope).aggregate(total=Sum('amount'))['total'])
            rows.append({'zone_id': zone.id, 'zone_name': zone.name, 'members': members, 'offerings_total': offerings_total})
            total_members += members
            total_offerings += offerings_total

        for row in rows:
            member_share = (row['members'] / total_members) if total_members else 0
            offering_share = (row['offerings_total'] / total_offerings) if total_offerings else 0
            weighted = (member_share * 0.5) + (offering_share * 0.5)
            row['member_share'] = round(member_share * 100, 2)
            row['offering_share'] = round(offering_share * 100, 2)
            row['recommended_share'] = round(weighted * 100, 2)
            row['recommended_allocation'] = round(total_budget * weighted, 2) if total_budget > 0 else 0.0

        return Response({
            'total_budget': total_budget,
            'zones': rows,
            'total_members': total_members,
            'total_offerings': total_offerings,
        })


class SystemHealthView(APIView):
    """System health and performance metrics. National leader only."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        if request.user.role != 'national_leader':
            return Response({'error': 'Only national leaders can view system health metrics.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = total_users - active_users
        new_this_week = User.objects.filter(created_at__gte=week_ago).count()
        new_this_month = User.objects.filter(created_at__gte=month_ago).count()

        total_churches = Church.objects.count()
        churches_without_leader = Church.objects.filter(church_type='local').exclude(
            id__in=User.objects.filter(role='local_leader', is_active=True).values('church_id')
        ).count()
        zones_without_leader = Church.objects.filter(church_type='zone').exclude(
            id__in=User.objects.filter(role='zone_leader', is_active=True).values('church_id')
        ).count()

        pending_registrations = MemberRegistration.objects.filter(status='pending').count()
        pending_transfers = Transfer.objects.filter(status='pending').count()
        pending_user_approvals = User.objects.filter(is_approved=False, is_active=True).count()

        total_offerings = _safe_amount(Offering.objects.aggregate(total=Sum('amount'))['total'])
        offerings_this_month = _safe_amount(Offering.objects.filter(payment_date__gte=month_ago).aggregate(total=Sum('amount'))['total'])

        total_events = Event.objects.count()
        active_events = Event.objects.filter(is_active=True).count()

        total_notifications = 0
        unread_notifications = 0
        try:
            from apps.notifications.models import Notification as NotificationModel
            total_notifications = NotificationModel.objects.count()
            unread_notifications = NotificationModel.objects.filter(is_read=False).count()
        except Exception:
            pass

        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'inactive': inactive_users,
                'new_this_week': new_this_week,
                'new_this_month': new_this_month,
                'pending_approvals': pending_user_approvals,
            },
            'churches': {
                'total': total_churches,
                'zones': Church.objects.filter(church_type='zone').count(),
                'regions': Church.objects.filter(church_type='region').count(),
                'districts': Church.objects.filter(church_type='district').count(),
                'locals': Church.objects.filter(church_type='local').count(),
                'locals_without_leader': churches_without_leader,
                'zones_without_leader': zones_without_leader,
            },
            'operations': {
                'pending_registrations': pending_registrations,
                'pending_transfers': pending_transfers,
            },
            'financial': {
                'total_offerings': total_offerings,
                'offerings_this_month': offerings_this_month,
            },
            'events': {
                'total': total_events,
                'active': active_events,
            },
            'notifications': {
                'total': total_notifications,
                'unread': unread_notifications,
            },
        })


class SystemDataExportView(APIView):
    """Full system data export (CSV). National leader only."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        if request.user.role != 'national_leader':
            return Response({'error': 'Only national leaders can export system data.'}, status=status.HTTP_403_FORBIDDEN)

        import csv as csv_module
        response = HttpResponse(content_type='text/csv')
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        response['Content-Disposition'] = f'attachment; filename="cfct_system_export_{timestamp}.csv"'

        writer = csv_module.writer(response)

        writer.writerow(['=== CFCT System Export ==='])
        writer.writerow([f'Generated: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'])
        writer.writerow([])

        writer.writerow(['=== CHURCH HIERARCHY ==='])
        writer.writerow(['ID', 'Name', 'Type', 'Parent ID', 'Parent Name', 'Is Active'])
        for church in Church.objects.select_related('parent_church').order_by('church_type', 'name'):
            writer.writerow([
                church.id,
                church.name,
                church.church_type,
                church.parent_church_id or '',
                church.parent_church.name if church.parent_church else '',
                church.is_active,
            ])

        writer.writerow([])
        writer.writerow(['=== USERS ==='])
        writer.writerow(['ID', 'Username', 'Full Name', 'Email', 'Phone', 'Role', 'Church', 'Is Active', 'Is Approved', 'Joined'])
        for user in User.objects.select_related('church').order_by('role', 'full_name'):
            writer.writerow([
                user.id,
                user.username,
                user.get_full_name(),
                user.email or '',
                user.phone or '',
                user.role,
                user.church.name if user.church else '',
                user.is_active,
                user.is_approved,
                user.created_at.strftime('%Y-%m-%d') if user.created_at else '',
            ])

        writer.writerow([])
        writer.writerow(['=== OFFERINGS ==='])
        writer.writerow(['ID', 'Member', 'Church', 'Type', 'Amount', 'Payment Method', 'Date', 'Receipt'])
        for offering in Offering.objects.select_related('member', 'church').order_by('-payment_date'):
            writer.writerow([
                offering.id,
                offering.member.get_full_name() if offering.member else '',
                offering.church.name if offering.church else '',
                offering.offering_type,
                offering.amount,
                offering.payment_method,
                offering.payment_date.isoformat() if offering.payment_date else '',
                offering.receipt_no or '',
            ])

        return response


class OfferingSummaryView(APIView):
    """Get offering summary by type"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        offerings = Offering.objects.filter(church__in=get_accessible_churches(request.user))
        
        summary = []
        for offering_type, _ in Offering.OFFERING_TYPES:
            total = offerings.filter(offering_type=offering_type).aggregate(total=Sum('amount'))['total'] or 0
            if total > 0:
                summary.append({
                    'type': offering_type,
                    'total': total
                })
        
        return Response(summary)    

class ChurchTopView(generics.ListAPIView):
    """Get top churches by offerings"""
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        limit = self.request.query_params.get('limit', 5)
        try:
            limit = int(limit)
        except ValueError:
            limit = 5
        
        accessible_churches = get_accessible_churches(self.request.user)
        # Annotate with total offerings and order by it
        queryset = accessible_churches.annotate(
            total_offerings=Sum('offerings__amount')
        ).order_by('-total_offerings')[:limit]
        
        return queryset

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        user = request.user
        user_church = user.church
        now = timezone.now()

        def pending_count_for(churches_queryset=None):
            base = MemberRegistration.objects.filter(status='pending')
            if churches_queryset is not None:
                base = base.filter(church__in=churches_queryset)
            return base.count()

        def members_queryset_for(churches_queryset=None):
            base = User.objects.filter(role__in=['local_member', 'local_leader'])
            if churches_queryset is not None:
                base = base.filter(church__in=churches_queryset)
            return base

        def offerings_total_for(churches_queryset=None):
            base = Offering.objects.all()
            if churches_queryset is not None:
                base = base.filter(church__in=churches_queryset)
            return float(base.aggregate(total=Sum('amount'))['total'] or 0)

        def events_total_for(churches_queryset=None):
            base = Event.objects.filter(is_active=True).filter(
                Q(end_date__gte=now)
                | Q(end_date__isnull=True, start_date__gte=now)
            )
            if churches_queryset is not None:
                base = base.filter(church__in=churches_queryset)
            return base.count()

        def prayer_requests_total_for(churches_queryset=None):
            base = PrayerRequest.objects.filter(status='pending')
            if churches_queryset is not None:
                base = base.filter(member__church__in=churches_queryset)
            return base.count()

        def monthly_growth_for(churches_queryset=None):
            base = members_queryset_for(churches_queryset)
            current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            previous_month_end = current_month_start - timedelta(days=1)
            previous_month_start = previous_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            current_total = base.filter(created_at__gte=current_month_start).count()
            previous_total = base.filter(
                created_at__gte=previous_month_start,
                created_at__lt=current_month_start,
            ).count()

            if previous_total == 0:
                return 100 if current_total > 0 else 0

            return round(((current_total - previous_total) / previous_total) * 100, 1)

        def weekly_attendance_for(churches_queryset=None):
            week_start = timezone.localdate() - timedelta(days=6)
            attendance = AttendanceRecord.objects.filter(service_date__gte=week_start)
            if churches_queryset is not None:
                attendance = attendance.filter(church__in=churches_queryset)
            return int(attendance.aggregate(total=Sum('attendance_count'))['total'] or 0)

        def attendance_rate_for(churches_queryset=None):
            month_start = timezone.localdate() - timedelta(days=27)
            attendance = AttendanceRecord.objects.filter(service_date__gte=month_start)
            if churches_queryset is not None:
                attendance = attendance.filter(church__in=churches_queryset)

            average_attendance = float(attendance.aggregate(avg=Avg('attendance_count'))['avg'] or 0)
            member_total = members_queryset_for(churches_queryset).count()
            if member_total <= 0:
                return 0

            rate = (average_attendance / member_total) * 100
            return round(min(rate, 100), 1)

        def recent_members_payload(members_queryset):
            return [
                {
                    'id': member.id,
                    'username': member.username,
                    'full_name': member.full_name,
                    'email': member.email,
                    'created_at': member.created_at,
                }
                for member in members_queryset[:5]
            ]

        def apply_scope_metrics(churches_queryset=None):
            stats['total_offerings'] = offerings_total_for(churches_queryset)
            stats['total_events'] = events_total_for(churches_queryset)
            stats['prayer_requests'] = prayer_requests_total_for(churches_queryset)
            stats['monthly_growth'] = monthly_growth_for(churches_queryset)
            stats['weekly_attendance'] = weekly_attendance_for(churches_queryset)
            stats['attendance_rate'] = attendance_rate_for(churches_queryset)
        
        # Initialize stats
        stats = {
            'total_members': 0,
            'total_churches': 0,
            'total_offerings': 0,
            'total_events': 0,
            'zones': 0,
            'regions': 0,
            'districts': 0,
            'locals': 0,
            'pending_approvals': 0,
            'monthly_growth': 0,
            'weekly_attendance': 0,
            'attendance_rate': 0,
            'prayer_requests': 0,
            'recent_members': []
        }

        # Drill-down context: national/zone/regional/district leaders can pass ?church_id=X
        context_church_id = request.query_params.get('church_id')
        if context_church_id and user.role in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader']:
            try:
                ctx = Church.objects.get(id=context_church_id)
                ct = ctx.church_type
                if ct == 'zone':
                    scope = Church.objects.filter(
                        Q(id=ctx.id) | Q(parent_church=ctx) |
                        Q(parent_church__parent_church=ctx) |
                        Q(parent_church__parent_church__parent_church=ctx)
                    )
                    stats['total_churches'] = scope.count()
                    stats['total_members'] = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
                    stats['regions'] = Church.objects.filter(parent_church=ctx, church_type='region').count()
                    stats['districts'] = Church.objects.filter(parent_church__parent_church=ctx, church_type='district').count()
                    stats['locals'] = Church.objects.filter(parent_church__parent_church__parent_church=ctx, church_type='local').count()
                    stats['pending_approvals'] = pending_count_for(scope)
                    apply_scope_metrics(scope)
                    recent_members = members_queryset_for(scope).order_by('-created_at')
                elif ct == 'region':
                    scope = Church.objects.filter(
                        Q(id=ctx.id) | Q(parent_church=ctx) | Q(parent_church__parent_church=ctx)
                    )
                    stats['total_churches'] = scope.count()
                    stats['total_members'] = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
                    stats['districts'] = Church.objects.filter(parent_church=ctx, church_type='district').count()
                    stats['locals'] = Church.objects.filter(parent_church__parent_church=ctx, church_type='local').count()
                    stats['pending_approvals'] = pending_count_for(scope)
                    apply_scope_metrics(scope)
                    recent_members = members_queryset_for(scope).order_by('-created_at')
                elif ct == 'district':
                    scope = Church.objects.filter(Q(id=ctx.id) | Q(parent_church=ctx))
                    stats['total_churches'] = scope.count()
                    stats['total_members'] = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
                    stats['locals'] = Church.objects.filter(parent_church=ctx, church_type='local').count()
                    stats['pending_approvals'] = pending_count_for(scope)
                    apply_scope_metrics(scope)
                    recent_members = members_queryset_for(scope).order_by('-created_at')
                elif ct == 'local':
                    local_qs = Church.objects.filter(id=ctx.id)
                    stats['total_churches'] = 1
                    stats['total_members'] = User.objects.filter(church=ctx, role__in=['local_member', 'local_leader']).count()
                    stats['pending_approvals'] = pending_count_for(local_qs)
                    apply_scope_metrics(local_qs)
                    recent_members = members_queryset_for(local_qs).order_by('-created_at')
                else:
                    recent_members = []
                stats['recent_members'] = recent_members_payload(recent_members)
                return Response(stats)
            except Church.DoesNotExist:
                pass  # Fall through to role-based logic

        # Role-based data filtering
        if user.role == 'national_leader':
            # National leader sees everything
            stats['total_members'] = User.objects.filter(role__in=['local_member', 'local_leader']).count()
            stats['total_churches'] = Church.objects.count()
            stats['zones'] = Church.objects.filter(church_type='zone').count()
            stats['regions'] = Church.objects.filter(church_type='region').count()
            stats['districts'] = Church.objects.filter(church_type='district').count()
            stats['locals'] = Church.objects.filter(church_type='local').count()
            stats['pending_approvals'] = pending_count_for()
            apply_scope_metrics()
            
            # Get recent members
            recent_members = members_queryset_for().order_by('-created_at')
            
        elif user.role == 'zone_leader' and user_church and user_church.church_type == 'zone':
            # Zone leader sees only their zone and below
            zone_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church) |
                Q(parent_church__parent_church__parent_church=user_church)
            )
            stats['total_churches'] = zone_churches.count()
            stats['total_members'] = User.objects.filter(church__in=zone_churches, role__in=['local_member', 'local_leader']).count()
            stats['regions'] = Church.objects.filter(parent_church=user_church, church_type='region').count()
            stats['districts'] = Church.objects.filter(parent_church__parent_church=user_church, church_type='district').count()
            stats['locals'] = Church.objects.filter(parent_church__parent_church__parent_church=user_church, church_type='local').count()
            stats['zones'] = 1
            stats['pending_approvals'] = pending_count_for(zone_churches)
            apply_scope_metrics(zone_churches)
            
            # Get recent members in zone
            recent_members = members_queryset_for(zone_churches).order_by('-created_at')
            
        elif user.role == 'regional_leader' and user_church and user_church.church_type == 'region':
            # Regional leader sees only their region and below
            region_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church)
            )
            stats['total_churches'] = region_churches.count()
            stats['total_members'] = User.objects.filter(church__in=region_churches, role__in=['local_member', 'local_leader']).count()
            stats['districts'] = Church.objects.filter(parent_church=user_church, church_type='district').count()
            stats['locals'] = Church.objects.filter(parent_church__parent_church=user_church, church_type='local').count()
            stats['pending_approvals'] = pending_count_for(region_churches)
            apply_scope_metrics(region_churches)
            
            # Get recent members in region
            recent_members = members_queryset_for(region_churches).order_by('-created_at')
            
        elif user.role == 'district_leader' and user_church and user_church.church_type == 'district':
            # District leader sees only their district and below
            district_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church)
            )
            stats['total_churches'] = district_churches.count()
            stats['total_members'] = User.objects.filter(church__in=district_churches, role__in=['local_member', 'local_leader']).count()
            stats['locals'] = Church.objects.filter(parent_church=user_church, church_type='local').count()
            stats['pending_approvals'] = pending_count_for(district_churches)
            apply_scope_metrics(district_churches)
            
            # Get recent members in district
            recent_members = members_queryset_for(district_churches).order_by('-created_at')
            
        elif user_church:
            # Local leader or member sees only their church
            stats['total_churches'] = 1
            stats['total_members'] = User.objects.filter(church=user_church, role__in=['local_member', 'local_leader']).count()
            stats['pending_approvals'] = pending_count_for(Church.objects.filter(id=user_church.id)) if user.role == 'local_leader' else 0
            local_scope = Church.objects.filter(id=user_church.id)
            apply_scope_metrics(local_scope)
            
            # Get recent members in local church
            recent_members = members_queryset_for(local_scope).order_by('-created_at')
        else:
            recent_members = []
        
        stats['recent_members'] = recent_members_payload(recent_members)
        
        return Response(stats)

class ZoneListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Church.objects.filter(church_type='zone')
        if user.role == 'national_leader':
            return Church.objects.filter(church_type='zone')
        if not user.church:
            return Church.objects.none()
        return Church.objects.filter(id=user.church.id)  # Zone leaders see only their zone

class RegionListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id') or self.request.query_params.get('zone_id')
        if not user.is_authenticated:
            qs = Church.objects.filter(church_type='region')
        elif user.role == 'national_leader':
            qs = Church.objects.filter(church_type='region')
        elif user.role == 'zone_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='region', parent_church=user.church)
        elif user.role == 'regional_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(id=user.church.id)
        else:
            return Church.objects.none()
        if parent_id:
            qs = qs.filter(parent_church_id=parent_id)
        return qs

class DistrictListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id') or self.request.query_params.get('region_id')
        zone_id = self.request.query_params.get('zone_id')
        if not user.is_authenticated:
            qs = Church.objects.filter(church_type='district')
        elif user.role == 'national_leader':
            qs = Church.objects.filter(church_type='district')
        elif user.role == 'zone_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='district', parent_church__parent_church=user.church)
        elif user.role == 'regional_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='district', parent_church=user.church)
        elif user.role == 'district_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(id=user.church.id)
        else:
            return Church.objects.none()
        if parent_id:
            qs = qs.filter(parent_church_id=parent_id)
        if zone_id:
            qs = qs.filter(parent_church__parent_church_id=zone_id)
        return qs

class LocalChurchListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id') or self.request.query_params.get('district_id')
        region_id = self.request.query_params.get('region_id')
        zone_id = self.request.query_params.get('zone_id')
        if not user.is_authenticated:
            qs = Church.objects.filter(church_type='local')
        elif user.role == 'national_leader':
            qs = Church.objects.filter(church_type='local')
        elif user.role == 'zone_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='local', parent_church__parent_church__parent_church=user.church)
        elif user.role == 'regional_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='local', parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='local', parent_church=user.church)
        else:
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(id=user.church.id)
        if parent_id:
            qs = qs.filter(parent_church_id=parent_id)
        if region_id:
            qs = qs.filter(parent_church__parent_church_id=region_id)
        if zone_id:
            qs = qs.filter(parent_church__parent_church__parent_church_id=zone_id)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        church_ids = [item['id'] for item in serializer.data]
        if not church_ids:
            return Response([])

        member_counts = {
            row['church_id']: row['count']
            for row in User.objects.filter(
                church_id__in=church_ids,
                role__in=['local_member', 'local_leader'],
                is_active=True,
            )
            .values('church_id')
            .annotate(count=Count('id'))
        }

        offerings_totals = {
            row['church_id']: _safe_amount(row['total'])
            for row in Offering.objects.filter(church_id__in=church_ids)
            .values('church_id')
            .annotate(total=Sum('amount'))
        }

        week_start = timezone.localdate() - timedelta(days=6)
        attendance_totals = {
            row['church_id']: int(row['total'] or 0)
            for row in AttendanceRecord.objects.filter(
                church_id__in=church_ids,
                service_date__gte=week_start,
            )
            .values('church_id')
            .annotate(total=Sum('attendance_count'))
        }

        pastors_by_church = {}
        pastors = User.objects.filter(
            church_id__in=church_ids,
            role='local_leader',
            is_active=True,
        ).order_by('created_at')
        for pastor in pastors:
            if pastor.church_id not in pastors_by_church:
                pastors_by_church[pastor.church_id] = pastor

        enriched = []
        for church in serializer.data:
            pastor = pastors_by_church.get(church['id'])
            enriched.append(
                {
                    **church,
                    'members': member_counts.get(church['id'], 0),
                    'offerings': offerings_totals.get(church['id'], 0.0),
                    'attendance': attendance_totals.get(church['id'], 0),
                    'pastor': pastor.get_full_name() if pastor else '',
                    'pastor_email': pastor.email if pastor else '',
                    'pastor_phone': pastor.phone if pastor else '',
                }
            )

        return Response(enriched)

class ChurchHierarchyView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        national = Church.objects.filter(church_type='national').first()
        if not national:
            return Response({'error': 'National church not found'}, status=404)
        
        hierarchy = {
            'id': national.id,
            'name': national.name,
            'type': national.church_type,
            'zones': []
        }
        
        zones = Church.objects.filter(parent_church=national, church_type='zone')
        for zone in zones:
            zone_data = {
                'id': zone.id,
                'name': zone.name,
                'type': zone.church_type,
                'regions': []
            }
            regions = Church.objects.filter(parent_church=zone, church_type='region')
            for region in regions:
                region_data = {
                    'id': region.id,
                    'name': region.name,
                    'type': region.church_type,
                    'districts': []
                }
                districts = Church.objects.filter(parent_church=region, church_type='district')
                for district in districts:
                    district_data = {
                        'id': district.id,
                        'name': district.name,
                        'type': district.church_type,
                        'locals': []
                    }
                    locals_churches = Church.objects.filter(parent_church=district, church_type='local')
                    district_data['locals'] = [
                        {'id': l.id, 'name': l.name, 'type': l.church_type}
                        for l in locals_churches
                    ]
                    region_data['districts'].append(district_data)
                zone_data['regions'].append(region_data)
            hierarchy['zones'].append(zone_data)
        
        return Response(hierarchy)

class UserRoleStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        stats = {
            'national_leaders': User.objects.filter(role='national_leader').count(),
            'zone_leaders': User.objects.filter(role='zone_leader').count(),
            'regional_leaders': User.objects.filter(role='regional_leader').count(),
            'district_leaders': User.objects.filter(role='district_leader').count(),
            'local_leaders': User.objects.filter(role='local_leader').count(),
            'local_members': User.objects.filter(role='local_member').count(),
            'finance_team': User.objects.filter(role='finance_team').count(),
            'total': User.objects.count(),
            'pending_approvals': User.objects.filter(is_approved=False, is_active=True).count()
        }
        return Response(stats)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([permissions.IsAuthenticated])
def export_report_view(request, report_type):
    format_type = request.query_params.get('file_format', 'pdf')
    parameters = request.query_params.dict()

    if format_type == 'excel':
        file_data, filename = export_to_excel(report_type, parameters)
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif format_type == 'csv':
        file_data, filename = export_to_csv(report_type, parameters)
        content_type = 'text/csv'
    else:
        file_data, filename = export_to_pdf(report_type, parameters)
        content_type = 'application/pdf'

    response = HttpResponse(file_data, content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


class ChurchPageEntryViewSet(viewsets.ModelViewSet):
    """Pastor-managed content entries for Financial Oversight, Pastoral Care, and Services Planning pages."""

    serializer_class = ChurchPageEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        accessible_churches = get_accessible_churches(user)
        queryset = ChurchPageEntry.objects.filter(church__in=accessible_churches).select_related('church', 'created_by')

        page_type = self.request.query_params.get('page_type', '').strip()
        if page_type:
            queryset = queryset.filter(page_type=page_type)

        church_id = self.request.query_params.get('church_id', '').strip()
        if church_id:
            queryset = queryset.filter(church_id=church_id)

        return queryset.order_by('order', 'created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only church leaders can manage page content.')
        if not user.church_id:
            raise PermissionDenied('Your profile must be assigned to a church.')
        serializer.save(church=user.church, created_by=user)

    def perform_update(self, serializer):
        entry = self.get_object()
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only church leaders can edit page content.')
        if not get_accessible_churches(user).filter(id=entry.church_id).exists():
            raise PermissionDenied('You are not allowed to edit content for this church.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only church leaders can delete page content.')
        if not get_accessible_churches(user).filter(id=instance.church_id).exists():
            raise PermissionDenied('You are not allowed to delete content for this church.')
        instance.delete()


class SermonViewSet(viewsets.ModelViewSet):
    """Church sermon archive — pastors can manage, members can read their church sermons."""

    serializer_class = SermonSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        if user.role in LEADER_ROLES or user.is_staff:
            accessible_churches = get_accessible_churches(user)
        else:
            # Members only see sermons from their own church
            if not user.church_id:
                return Sermon.objects.none()
            accessible_churches = Church.objects.filter(id=user.church_id)

        queryset = Sermon.objects.filter(church__in=accessible_churches).select_related('church', 'created_by')

        church_id = self.request.query_params.get('church_id', '').strip()
        if church_id:
            queryset = queryset.filter(church_id=church_id)

        series = self.request.query_params.get('series', '').strip()
        if series:
            queryset = queryset.filter(series_name__icontains=series)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only church leaders can add sermons.')
        if not user.church_id:
            raise PermissionDenied('Your profile must be assigned to a church.')
        serializer.save(church=user.church, created_by=user)

    def perform_update(self, serializer):
        sermon = self.get_object()
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only church leaders can edit sermons.')
        if not get_accessible_churches(user).filter(id=sermon.church_id).exists():
            raise PermissionDenied('You are not allowed to edit sermons for this church.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            raise PermissionDenied('Only church leaders can delete sermons.')
        if not get_accessible_churches(user).filter(id=instance.church_id).exists():
            raise PermissionDenied('You are not allowed to delete sermons for this church.')
        instance.delete()


# =============================================================================
# Tanzania Payment Views
# =============================================================================

class MobileMoneyPaymentView(APIView):
    """
    POST /api/offerings/payments/mobile-money/
    Creates an offering and initiates an Azampay STK push to the customer's
    mobile wallet (Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa).

    Request body:
        amount        (number)  – amount in TZS
        offering_type (string)  – e.g. "tithe"
        phone         (string)  – 07XXXXXXXX or 255XXXXXXXXX
        operator      (string)  – vodacom | tigo | airtel | halotel
        member        (int, opt)– member user ID
        notes         (string)  – optional notes
    """

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        import uuid as _uuid

        user = request.user
        if not user.church:
            return Response(
                {"error": "Your profile must be assigned to a church."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount = request.data.get("amount")
        offering_type = request.data.get("offering_type", "offering")
        phone = request.data.get("phone", "").strip()
        operator = request.data.get("operator", "vodacom").strip().lower()
        member_id = request.data.get("member")
        notes = request.data.get("notes", "")

        # Validate required fields
        if not amount:
            return Response({"error": "amount is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not phone:
            return Response({"error": "phone number is required."}, status=status.HTTP_400_BAD_REQUEST)
        if operator not in ("vodacom", "tigo", "airtel", "halotel"):
            return Response(
                {"error": "operator must be one of: vodacom, tigo, airtel, halotel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "amount must be a positive number."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve member
        member = None
        if member_id:
            try:
                member = User.objects.get(id=int(member_id))
            except (User.DoesNotExist, ValueError, TypeError):
                return Response({"error": "Invalid member ID."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique external ID (used as transaction_reference)
        external_id = f"MM-{_uuid.uuid4().hex[:12].upper()}"

        # Create offering record with pending status
        offering = Offering(
            church=user.church,
            member=member,
            amount=amount,
            offering_type=offering_type,
            payment_method="mobile_money",
            payment_status="pending",
            payment_phone=phone,
            payment_operator=operator,
            transaction_reference=external_id,
            recorded_by=user,
            notes=notes,
        )
        offering.save()
        mobile_money_details = get_church_mobile_money_details(user.church)
        provider_number = mobile_money_details.get(operator, {}).get('lipa_number', '')

        # Initiate STK push via Azampay
        try:
            svc = AzampayService()
            azampay_resp = svc.initiate_push(
                phone=phone,
                amount=str(int(amount)),
                external_id=external_id,
                operator=operator,
            )
            message = azampay_resp.get("message", "STK push sent. Please check your phone.")
        except ValueError as exc:
            # Credentials not configured – inform admin without deleting the record
            message = (
                "Payment gateway not configured for automatic push. "
                "Use the church payment number shown below and keep the reference. "
                f"(Reference: {external_id})"
            )
        except Exception as exc:  # noqa: BLE001
            # Network / Azampay API error – keep offering as pending for retry
            message = (
                f"Could not send payment request to your phone. "
                f"Please try again or use a different method. (Reference: {external_id})"
            )

        operator_labels = {
            "vodacom": "Vodacom M-Pesa",
            "tigo": "Tigo Pesa",
            "airtel": "Airtel Money",
            "halotel": "Halopesa",
        }

        return Response(
            {
                "offering_id": offering.id,
                "payment_status": offering.payment_status,
                "transaction_reference": external_id,
                "operator_label": operator_labels.get(operator, operator),
                "provider_number": provider_number,
                "message": message,
            },
            status=status.HTTP_201_CREATED,
        )


class ChurchPaymentSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if not user.church:
            return Response({'error': 'Your profile must be assigned to a church.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_details = get_or_create_church_payment_details(user.church)
        serializer = ChurchPaymentDetailsSerializer(payment_details)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'Only leaders can update church payment settings.'}, status=status.HTTP_403_FORBIDDEN)
        if not user.church:
            return Response({'error': 'Your profile must be assigned to a church.'}, status=status.HTTP_400_BAD_REQUEST)

        payment_details = get_or_create_church_payment_details(user.church)
        serializer = ChurchPaymentDetailsSerializer(payment_details, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class BankTransferDetailsView(APIView):
    """
    GET /api/offerings/payments/bank-details/
    Returns church bank account details and a freshly generated unique
    reference number.  The client must show these to the user BEFORE
    asking them to make the transfer, and then supply the reference when
    creating the offering record via POST /api/offerings/.
    """

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        if not request.user.church:
            return Response({'error': 'Your profile must be assigned to a church.'}, status=status.HTTP_400_BAD_REQUEST)
        reference = generate_bank_reference()
        bank_details = get_church_bank_details(request.user.church)
        return Response(
            {
                "reference": reference,
                **bank_details,
                "instructions": (
                    "Please make a bank transfer to the account above using "
                    "the reference number shown. After completing the transfer, "
                    "return here and confirm to record your offering."
                ),
            }
        )


class PaymentStatusView(APIView):
    """
    GET /api/offerings/payments/status/<offering_id>/
    Poll the current payment_status of an offering.
    Used by the frontend to check if an Azampay STK push was approved.
    """

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, offering_id):
        try:
            offering = Offering.objects.get(id=offering_id)
        except Offering.DoesNotExist:
            return Response({"error": "Offering not found."}, status=status.HTTP_404_NOT_FOUND)

        # Members can only see their own offerings; leaders can see their church's
        user = request.user
        if user.role == "local_member" and offering.member_id != user.id and offering.recorded_by_id != user.id:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {
                "offering_id": offering.id,
                "payment_status": offering.payment_status,
                "payment_method": offering.payment_method,
                "amount": str(offering.amount),
                "transaction_reference": offering.transaction_reference,
                "receipt_no": offering.receipt_no or "",
            }
        )


class PaymentCallbackView(APIView):
    """
    POST /api/offerings/payments/callback/
    Azampay webhook endpoint.  Azampay calls this URL after the customer
    approves or rejects the STK push on their phone.

    Azampay callback payload (example):
        {
            "msisdn": "255XXXXXXXXX",
            "amount": "5000",
            "message": "payment successful",
            "utilityref": "<external_id we sent>",
            "operator": "Mpesa",
            "reference": "<azampay_transaction_id>",
            "timestamp": "2024-01-01T12:00:00"
        }

    Authentication: no JWT required (Azampay cannot provide a user token).
    Security: we validate that utilityref matches an existing offering.
    """

    permission_classes = []  # Public endpoint – validated by utilityref lookup
    authentication_classes = []

    def post(self, request):
        data = request.data
        external_id = data.get("utilityref") or data.get("externalId") or data.get("external_id", "")
        message = (data.get("message") or "").lower()
        azampay_ref = data.get("reference", "")

        if not external_id:
            return Response({"error": "utilityref is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            offering = Offering.objects.get(transaction_reference=external_id)
        except Offering.DoesNotExist:
            return Response({"error": "Offering not found."}, status=status.HTTP_404_NOT_FOUND)

        # Determine new status from message
        if "success" in message or "complet" in message:
            new_status = "completed"
        elif "fail" in message or "cancel" in message or "reject" in message or "declin" in message:
            new_status = "failed"
        else:
            # Unknown message; keep pending but log
            new_status = "pending"

        if offering.payment_status != new_status:
            offering.payment_status = new_status
            if azampay_ref:
                offering.transaction_reference = azampay_ref  # overwrite with Azampay's own ref
            offering.save(update_fields=["payment_status", "transaction_reference"])

        return Response({"status": "ok", "offering_id": offering.id, "payment_status": new_status})


class FinanceBudgetAllocationView(APIView):
    """
    Role-scoped budget allocation view.
    National leaders see the national budget; zone leaders see their zone;
    regional leaders see their region; district leaders see their district.
    Pass ?total_budget=<amount> to get recommended allocations.
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'Only leaders can view budget allocations.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            total_budget = float(request.query_params.get('total_budget', 0) or 0)
        except (TypeError, ValueError):
            total_budget = 0.0

        accessible = get_accessible_churches(user)

        # Build child scope based on role
        role_child_type = {
            'national_leader': 'zone',
            'zone_leader': 'region',
            'regional_leader': 'district',
            'district_leader': 'local',
            'local_leader': 'local',
        }
        child_type = role_child_type.get(user.role, 'local')
        children = accessible.filter(church_type=child_type).order_by('name')

        rows = []
        total_members = 0
        total_offerings = 0.0

        for church in children:
            scope = get_accessible_churches_for_church(church)
            members = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
            offerings_total = _safe_amount(
                Offering.objects.filter(church__in=scope).aggregate(total=Sum('amount'))['total']
            )
            rows.append({
                'church_id': church.id,
                'church_name': church.name,
                'church_type': church.church_type,
                'members': members,
                'offerings_total': offerings_total,
            })
            total_members += members
            total_offerings += offerings_total

        for row in rows:
            member_share = (row['members'] / total_members) if total_members else 0
            offering_share = (row['offerings_total'] / total_offerings) if total_offerings else 0
            weighted = (member_share * 0.5) + (offering_share * 0.5)
            row['member_share_pct'] = round(member_share * 100, 2)
            row['offering_share_pct'] = round(offering_share * 100, 2)
            row['recommended_share_pct'] = round(weighted * 100, 2)
            row['recommended_allocation'] = round(total_budget * weighted, 2) if total_budget > 0 else 0.0

        return Response({
            'scope': user.role,
            'total_budget': total_budget,
            'children': rows,
            'total_members': total_members,
            'total_offerings': total_offerings,
        })


def get_accessible_churches_for_church(church):
    """Return a queryset of all churches within a given church's sub-hierarchy."""
    return Church.objects.filter(
        Q(id=church.id)
        | Q(parent_church=church)
        | Q(parent_church__parent_church=church)
        | Q(parent_church__parent_church__parent_church=church)
    )


class FinanceReconciliationView(APIView):
    """
    Shows offerings with payment_status='pending' that may need manual reconciliation,
    grouped by church. Leaders only.
    """
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'Only leaders can view reconciliation data.'}, status=status.HTTP_403_FORBIDDEN)

        accessible = get_accessible_churches(user)

        pending_qs = Offering.objects.filter(
            church__in=accessible,
            payment_status='pending',
        ).select_related('church', 'member', 'recorded_by').order_by('church__name', '-created_at')

        # Apply optional filters
        church_id = request.query_params.get('church_id')
        if church_id:
            pending_qs = pending_qs.filter(church_id=church_id)

        start_date = request.query_params.get('start_date')
        if start_date:
            pending_qs = pending_qs.filter(payment_date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            pending_qs = pending_qs.filter(payment_date__lte=end_date)

        total_pending = _safe_amount(pending_qs.aggregate(total=Sum('amount'))['total'])
        count = pending_qs.count()

        serializer = OfferingSerializer(pending_qs[:200], many=True)

        return Response({
            'total_pending_amount': total_pending,
            'total_pending_count': count,
            'note': 'Showing up to 200 records. Use start_date/end_date/church_id to narrow results.',
            'records': serializer.data,
        })


class LogoutView(APIView):
    """Blacklist the refresh token so the session is fully invalidated server-side."""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = _RefreshToken(refresh_token)
                token.blacklist()
            except _TokenError:
                pass  # already invalid – that's fine
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
