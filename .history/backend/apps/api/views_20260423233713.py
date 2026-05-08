from django.contrib.admin.models import LogEntry
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Avg, Count, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from apps.accounts.models import User
from apps.churches.models import Church
from apps.departments.models import Department, DepartmentJoinRequest, DepartmentMember
from apps.events.models import Event, EventRegistration
from apps.attendance.models import AttendanceRecord
from apps.members.models import MemberRegistration
from apps.members.serializers import MemberRegistrationSerializer
from apps.news.models import News
from apps.notifications.models import Notification
from apps.offerings.models import Offering
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
    AttendanceSerializer,
    ChurchSerializer,
    DepartmentJoinRequestSerializer,
    EventSerializer,
    EventRegistrationSerializer,
    NotificationSerializer,
    OfferingSerializer,
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
GLOBAL_BROADCAST_ROLES = ['regional_leader', 'zone_leader', 'national_leader']


def has_role_or_above(user, role):
    return ROLE_HIERARCHY.get(user.role, -1) >= ROLE_HIERARCHY.get(role, -1)


def is_global_broadcast_content(content_owner):
    return bool(content_owner and content_owner.role in GLOBAL_BROADCAST_ROLES)


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
            return User.objects.all()
        return User.objects.filter(church=user.church)

class ChurchViewSet(viewsets.ModelViewSet):
    queryset = Church.objects.all()
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        user = self.request.user
        search = (self.request.query_params.get('search') or self.request.query_params.get('q') or self.request.query_params.get('church_name') or '').strip()
        alphabet = (self.request.query_params.get('alphabet') or '').strip()

        if user.role == 'national_leader':
            queryset = Church.objects.all()
        else:
            queryset = Church.objects.filter(Q(id=user.church_id) | Q(parent_church=user.church_id))

        if search:
            queryset = queryset.filter(name__icontains=search)
        if alphabet:
            queryset = queryset.filter(name__istartswith=alphabet[0])

        return queryset.order_by('name')

class MemberViewSet(viewsets.ModelViewSet):
    """View for church members (users with member roles)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        user = self.request.user
        user_church = user.church
        queryset = User.objects.none()
        
        # Role-based filtering
        if user.role == 'national_leader':
            # National leader sees all members
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
        
        return queryset.order_by('full_name', 'username')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

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
            accessible_churches = get_accessible_churches(user)
            queryset = queryset.filter(
                Q(church__in=accessible_churches)
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
        church = serializer.validated_data.get('church') or self.request.user.church
        serializer.save(church=church, created_by=self.request.user)

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

        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if offering_type:
            queryset = queryset.filter(offering_type=offering_type)

        return queryset

    def perform_create(self, serializer):
        # Ensure user has a church assigned
        if not self.request.user.church:
            raise DRFValidationError({"church": "Your profile must be assigned to a church to record offerings."})
        
        # Parse member if provided
        member_data = serializer.validated_data.get('member')
        member = None
        
        if member_data:
            # If member is already a User object, use it
            if isinstance(member_data, User):
                member = member_data
            # If it's a number (ID), try to fetch the user
            elif isinstance(member_data, (int, float)):
                try:
                    member = User.objects.get(id=int(member_data))
                except User.DoesNotExist:
                    raise DRFValidationError({"member": "Invalid member ID provided."})
        
        try:
            serializer.save(
                church=self.request.user.church,
                recorded_by=self.request.user,
                member=member,
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

class PrayerViewSet(viewsets.ModelViewSet):
    queryset = PrayerRequest.objects.all()
    serializer_class = AppPrayerRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        accessible_churches = get_accessible_churches(user)

        if user.role in LEADER_ROLES or user.role == 'finance_team' or user.is_staff:
            return PrayerRequest.objects.filter(member__church__in=accessible_churches).select_related('member')

        return PrayerRequest.objects.filter(member=user).select_related('member')

    def perform_create(self, serializer):
        prayer = serializer.save(member=self.request.user, is_public=False)

        if self.request.user.church_id:
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

    def get_queryset(self):
        user = self.request.user
        accessible_churches = get_accessible_churches(user)
        return Transfer.objects.filter(
            Q(from_church__in=accessible_churches)
            | Q(to_church__in=accessible_churches)
            | Q(member=user)
        ).select_related('member', 'from_church', 'to_church').distinct()

    def perform_create(self, serializer):
        from_church = serializer.validated_data.get('from_church') or self.request.user.church
        serializer.save(member=self.request.user, from_church=from_church)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        user = request.user

        if user.role not in LEADER_ROLES:
            return Response({'error': 'You are not authorized to approve this transfer'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == 'national_leader':
            transfer.approved_by_from = transfer.approved_by_from or user
            transfer.approved_by_to = transfer.approved_by_to or user
        elif transfer.from_church == user.church:
            transfer.approved_by_from = transfer.approved_by_from or user
        elif transfer.to_church == user.church:
            transfer.approved_by_to = transfer.approved_by_to or user
        else:
            return Response({'error': 'You are not authorized to approve this transfer'}, status=status.HTTP_403_FORBIDDEN)

        if transfer.approved_by_from and transfer.approved_by_to:
            transfer.status = 'approved'
            transfer.approval_date = timezone.now()
            transfer.member.church = transfer.to_church
            transfer.member.save(update_fields=['church'])

        transfer.save()
        return Response(self.get_serializer(transfer).data)

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
            queryset = News.objects.filter(
                Q(church__in=get_accessible_churches(user))
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
        church = serializer.validated_data.get('church') or self.request.user.church
        serializer.save(author=self.request.user, church=church)

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
        church = serializer.validated_data.get('church') or self.request.user.church
        serializer.save(church=church)

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

        join_request.status = 'rejected'
        join_request.reviewed_by = request.user
        join_request.reviewed_at = timezone.now()
        join_request.review_notes = (request.data.get('review_notes') or '').strip()
        join_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_notes'])

        create_notification(
            join_request.member,
            'Department Application Update',
            f'Your request to join {join_request.department.name} was not approved yet.',
            'warning',
        )

        return Response(DepartmentJoinRequestSerializer(join_request).data)

class GetCurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class MemberDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        user = request.user
        church = user.church
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
            for req in DepartmentJoinRequest.objects.filter(member=user, department_id__in=department_ids)
        }
        approved_department_ids = set(
            DepartmentMember.objects.filter(member=user, department_id__in=department_ids, is_active=True).values_list('department_id', flat=True)
        )

        now = timezone.now()
        upcoming_events_qs = Event.objects.filter(
            church=church,
            is_active=True,
        ).filter(Q(end_date__gte=now) | Q(end_date__isnull=True, start_date__gte=now)).order_by('start_date')
        past_events_qs = Event.objects.filter(
            church=church,
            is_active=True,
        ).filter(Q(end_date__lt=now) | Q(end_date__isnull=True, start_date__lt=now)).order_by('-start_date')

        event_registration_map = {
            reg.event_id: reg.status
            for reg in EventRegistration.objects.filter(member=user)
        }

        leaders = User.objects.filter(
            role__in=LEADER_ROLES,
            church_id=church.id,
            is_active=True,
        ).order_by('-created_at')

        if not leaders.exists() and church.parent_church_id:
            parent_ids = []
            current = church.parent_church
            while current:
                parent_ids.append(current.id)
                current = current.parent_church
            leaders = User.objects.filter(role__in=LEADER_ROLES, church_id__in=parent_ids, is_active=True).order_by('-created_at')

        payload = {
            'member': {
                'id': user.id,
                'full_name': user.get_full_name(),
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
            },
            'church': {
                'id': church.id,
                'name': church.name,
                'church_type': church.church_type,
            },
            'leaders': [
                {
                    'id': leader.id,
                    'full_name': leader.get_full_name(),
                    'role': leader.role,
                    'phone': leader.phone,
                    'email': leader.email,
                }
                for leader in leaders
            ],
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
                for prayer in PrayerRequest.objects.filter(member=user).order_by('-created_at')[:10]
            ],
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
    
    def get(self, request):
        if request.user.role != 'national_leader':
            return Response({'error': 'Only national leaders can view audit logs'}, status=status.HTTP_403_FORBIDDEN)

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
                'created_at': log.action_time,
            }
            for log in logs[:limit]
        ]
        return Response(data)

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
        parent_id = self.request.query_params.get('parent_id')
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
        parent_id = self.request.query_params.get('parent_id')
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
        return qs

class LocalChurchListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id')
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
        return qs

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