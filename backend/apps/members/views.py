from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.http import HttpResponse
from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from .models import MemberRegistration
from .serializers import MemberRegistrationSerializer
from apps.accounts.models import User
from apps.churches.models import Church
from config.utils.notifications import create_notification, send_email_notification
import json
import logging
import csv
import io
import re
import secrets
import string
from django.db import transaction

from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer

logger = logging.getLogger(__name__)

LEADER_ROLES = ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader']


def get_accessible_churches(user):
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


def get_registration_blocking_error(email):
    existing_user = User.objects.filter(email=email).first()
    if not existing_user:
        return None

    registration = MemberRegistration.objects.filter(user=existing_user).first()

    if registration and registration.status == 'pending':
        return 'This email is already registered and pending approval.'

    if existing_user.is_approved:
        return 'This email is already approved. Please log in.'

    if registration and registration.status == 'rejected':
        return 'This email has a rejected registration. Please contact church leadership for assistance.'

    return 'This email is already registered.'


def _generate_username_from_name(full_name, exclude_user_id=None):
    source_name = (full_name or '').strip().lower()
    normalized_name = re.sub(r'\s+', '_', source_name)
    base_username = re.sub(r'[^a-z0-9_]', '', normalized_name)[:30] or f"member_{int(timezone.now().timestamp())}"

    username = base_username
    counter = 1
    queryset = User.objects.all()
    if exclude_user_id:
        queryset = queryset.exclude(id=exclude_user_id)

    while queryset.filter(username=username).exists():
        suffix = str(counter)
        max_base_len = max(1, 30 - len(suffix))
        username = f"{base_username[:max_base_len]}{suffix}"
        counter += 1

    return username


def _generate_secure_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _send_approval_credentials_email(user_obj, approved_name, username, password):
    if not user_obj.email:
        return
    send_email_notification(
        'CFCT Registration Approved - Your Access Credentials',
        (
            f'Hello {approved_name},\n\n'
            'Your registration has been approved. Use the credentials below for your first login:\n\n'
            f'Username: {username}\n'
            f'Password: {password}\n\n'
            'For security, please change your password immediately after your first login.\n\n'
            'Blessings,\nCFCT Management Team'
        ),
        [user_obj.email],
    )

class MemberRegistrationViewSet(viewsets.ModelViewSet):
    queryset = MemberRegistration.objects.all()
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            return MemberRegistration.objects.none()
        return MemberRegistration.objects.filter(church__in=get_accessible_churches(user))


@method_decorator(csrf_exempt, name='dispatch')
class MemberRegisterView(generics.CreateAPIView):
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    
    def create(self, request, *args, **kwargs):
        print("=" * 50)
        print("REGISTRATION REQUEST RECEIVED")
        print("=" * 50)
        
        data = request.data
        personal_info = data.get('personal_info', {})
        guardian_info = data.get('guardian_info', {})
        spiritual_info = data.get('spiritual_info', {})
        preferred_church_id = data.get('preferred_church_id')
        
        print(f"Personal Info: {personal_info}")
        print(f"Guardian Info: {guardian_info}")
        print(f"Spiritual Info: {spiritual_info}")
        print(f"Preferred Church ID: {preferred_church_id}")
        
        if not personal_info.get('full_name'):
            return Response(
                {'error': 'Full name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not personal_info.get('email'):
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not personal_info.get('phone'):
            return Response(
                {'error': 'Phone number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        duplicate_error = get_registration_blocking_error(personal_info.get('email', '').strip())
        if duplicate_error:
            return Response({'error': duplicate_error}, status=status.HTTP_400_BAD_REQUEST)
        email = personal_info.get('email', '').strip()
        
        full_name = personal_info.get('full_name', '')
        username = _generate_username_from_name(full_name)
        
        if not preferred_church_id:
            return Response(
                {'error': 'Please select a church'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            church = Church.objects.get(id=preferred_church_id)
            print(f"Church found: {church.name}")
        except Church.DoesNotExist:
            return Response(
                {'error': 'Selected church not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=_generate_secure_password(24),
                full_name=personal_info.get('full_name', ''),
                phone=personal_info.get('phone', ''),
                role='local_member',
                is_active=False,
                is_approved=False,
                church=church,
                neighborhood=personal_info.get('neighborhood', ''),
                guardian_name=guardian_info.get('guardian_name', ''),
                guardian_phone=guardian_info.get('guardian_phone', ''),
                guardian_relationship=guardian_info.get('relationship', ''),
                date_of_birth=spiritual_info.get('date_of_birth', None) or None,
                christian_birth_date=spiritual_info.get('christian_birth_date', None) or None,
                spiritual_gifts=spiritual_info.get('spiritual_gifts', []),
                ministry_interests=spiritual_info.get('ministry_interests', [])
            )
            print(f"User created: {user.username} (ID: {user.id})")
        except Exception as e:
            print(f"Error creating user: {str(e)}")
            return Response(
                {'error': f'Failed to create user: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            registration = MemberRegistration.objects.create(
                user=user,
                church=church,
                personal_info=personal_info,
                guardian_info=guardian_info,
                spiritual_info=spiritual_info,
                status='pending'
            )
            print(f"Registration created: {registration.id}")
        except Exception as e:
            print(f"Error creating registration: {str(e)}")
            user.delete()
            return Response(
                {'error': f'Failed to create registration: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        leaders = User.objects.filter(
            church=church, 
            role__in=LEADER_ROLES
        )
        for leader in leaders:
            try:
                create_notification(
                    leader,
                    'New Member Registration',
                    f'New member {user.full_name} has registered at {church.name}',
                    'info'
                )
            except Exception as notify_error:
                logger.warning('Registration notification failed for leader %s: %s', leader.id, notify_error)
        
        return Response(
            {
                'message': 'Registration submitted successfully',
                'registration_id': registration.id,
                'user_id': user.id,
            },
            status=status.HTTP_201_CREATED
        )


class LeaderRegisterMemberView(APIView):
    """
    Authenticated leaders register a user directly (auto-approved).
    Accepts role field to register members OR leaders.
    Church assignment always uses a local church via zone→region→district→local cascade.
    """
    permission_classes = [permissions.IsAuthenticated]

    # Map each role to the minimum registrar role required
    ROLE_PERMISSION_MAP = {
        'local_member':     ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader'],
        'local_leader':     ['national_leader', 'zone_leader', 'regional_leader', 'district_leader'],
        'district_leader':  ['national_leader', 'zone_leader', 'regional_leader'],
        'regional_leader':  ['national_leader', 'zone_leader'],
        'zone_leader':      ['national_leader'],
        'national_leader':  ['national_leader'],
        'finance_team':     ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader'],
    }

    VALID_ROLES = list(ROLE_PERMISSION_MAP.keys())

    def post(self, request):
        registrar = request.user
        if registrar.role not in LEADER_ROLES:
            return Response(
                {'error': 'You do not have permission to register users'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        personal_info = data.get('personal_info', {})
        guardian_info = data.get('guardian_info', {})
        spiritual_info = data.get('spiritual_info', {})
        preferred_church_id = data.get('preferred_church_id')
        requested_role = (data.get('role') or 'local_member').strip()

        if requested_role not in self.VALID_ROLES:
            return Response({'error': f'Invalid role. Valid roles: {", ".join(self.VALID_ROLES)}'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_registrars = self.ROLE_PERMISSION_MAP.get(requested_role, [])
        if registrar.role not in allowed_registrars:
            return Response(
                {'error': f'You do not have permission to register a user with role "{requested_role}"'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not personal_info.get('full_name'):
            return Response({'error': 'Full name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not personal_info.get('phone'):
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not preferred_church_id:
            return Response({'error': 'Please select a local church'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate the church exists and is local
        try:
            church = Church.objects.get(id=preferred_church_id, church_type='local')
        except Church.DoesNotExist:
            return Response(
                {'error': 'Selected church not found or is not a local church'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = personal_info.get('email', '').strip()
        phone = personal_info.get('phone', '').strip()

        if email:
            duplicate_error = get_registration_blocking_error(email)
            if duplicate_error:
                return Response({'error': duplicate_error}, status=status.HTTP_400_BAD_REQUEST)
            username_base = email.split('@')[0]
        else:
            username_base = f"user_{phone}" if phone else f"user_{int(timezone.now().timestamp())}"

        username = username_base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{username_base}{counter}"
            counter += 1

        # Generate a random password; the user can reset it via password reset
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

        with transaction.atomic():
            try:
                new_user = User.objects.create_user(
                    username=username,
                    email=email or f"{username}@cfct.local",
                    password=password,
                    full_name=personal_info.get('full_name', ''),
                    phone=phone,
                    role=requested_role,
                    is_active=True,
                    is_approved=True,
                    church=church,
                    neighborhood=personal_info.get('neighborhood', ''),
                    guardian_name=guardian_info.get('guardian_name', ''),
                    guardian_phone=guardian_info.get('guardian_phone', ''),
                    guardian_relationship=guardian_info.get('relationship', ''),
                    date_of_birth=spiritual_info.get('date_of_birth') or None,
                    christian_birth_date=spiritual_info.get('christian_birth_date') or None,
                    spiritual_gifts=spiritual_info.get('spiritual_gifts', []),
                    ministry_interests=spiritual_info.get('ministry_interests', []),
                )
            except Exception as e:
                return Response({'error': f'Failed to create user: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

            MemberRegistration.objects.create(
                user=new_user,
                church=church,
                personal_info=personal_info,
                guardian_info=guardian_info,
                spiritual_info=spiritual_info,
                status='approved',
                approved_by=registrar,
            )

        try:
            create_notification(
                registrar,
                'User Registered',
                f'{new_user.full_name} has been registered at {church.name} with role "{requested_role}"',
                'success'
            )
        except Exception:
            pass

        if email:
            try:
                _send_approval_credentials_email(
                    new_user,
                    new_user.full_name or username,
                    username,
                    password,
                )
            except Exception as email_error:
                logger.warning('Leader registration email failed for user %s: %s', new_user.id, email_error)

        return Response(
            {
                'message': 'User registered successfully',
                'user_id': new_user.id,
                'username': username,
                'role': requested_role,
                'church': church.name,
            },
            status=status.HTTP_201_CREATED
        )


@csrf_exempt
def member_register_public(request):
    """Public registration endpoint - handles POST requests"""
    
    # Handle OPTIONS request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    
    # Only allow POST for registration
    if request.method != "POST":
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    print("=" * 50)
    print("REGISTRATION REQUEST RECEIVED (Public View)")
    print("=" * 50)
    
    try:
        data = json.loads(request.body)
        print(f"Request data: {data}")
        
        personal_info = data.get('personal_info', {})
        guardian_info = data.get('guardian_info', {})
        spiritual_info = data.get('spiritual_info', {})
        preferred_church_id = data.get('preferred_church_id')
        
        if not personal_info.get('full_name'):
            return JsonResponse({'error': 'Full name is required'}, status=400)
        
        if not personal_info.get('email'):
            return JsonResponse({'error': 'Email is required'}, status=400)
        
        if not personal_info.get('phone'):
            return JsonResponse({'error': 'Phone number is required'}, status=400)

        duplicate_error = get_registration_blocking_error(personal_info.get('email', '').strip())
        if duplicate_error:
            return JsonResponse({'error': duplicate_error}, status=400)
        email = personal_info.get('email', '').strip()
        
        full_name = personal_info.get('full_name', '')
        username = _generate_username_from_name(full_name)
        
        if not preferred_church_id:
            return JsonResponse({'error': 'Please select a church'}, status=400)
        
        try:
            church = Church.objects.get(id=preferred_church_id)
        except Church.DoesNotExist:
            return JsonResponse({'error': 'Selected church not found'}, status=400)
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=_generate_secure_password(24),
                full_name=personal_info.get('full_name', ''),
                phone=personal_info.get('phone', ''),
                role='local_member',
                is_active=False,
                is_approved=False,
                church=church,
                neighborhood=personal_info.get('neighborhood', ''),
                guardian_name=guardian_info.get('guardian_name', ''),
                guardian_phone=guardian_info.get('guardian_phone', ''),
                guardian_relationship=guardian_info.get('relationship', ''),
                date_of_birth=spiritual_info.get('date_of_birth', None) or None,
                christian_birth_date=spiritual_info.get('christian_birth_date', None) or None,
                spiritual_gifts=spiritual_info.get('spiritual_gifts', []),
                ministry_interests=spiritual_info.get('ministry_interests', [])
            )
            print(f"User created: {user.username} (ID: {user.id})")
        except Exception as e:
            return JsonResponse({'error': f'Failed to create user: {str(e)}'}, status=400)
        
        try:
            registration = MemberRegistration.objects.create(
                user=user,
                church=church,
                personal_info=personal_info,
                guardian_info=guardian_info,
                spiritual_info=spiritual_info,
                status='pending'
            )
            print(f"Registration created: {registration.id}")
        except Exception as e:
            user.delete()
            return JsonResponse({'error': f'Failed to create registration: {str(e)}'}, status=400)
        
        leaders = User.objects.filter(
            church=church, 
            role__in=LEADER_ROLES
        )
        for leader in leaders:
            try:
                create_notification(
                    leader,
                    'New Member Registration',
                    f'New member {user.full_name} has registered at {church.name}',
                    'info'
                )
            except Exception as notify_error:
                logger.warning('Registration notification failed for leader %s: %s', leader.id, notify_error)
        
        return JsonResponse({
            'message': 'Registration submitted successfully',
            'registration_id': registration.id,
            'user_id': user.id,
        }, status=201)
        
    except json.JSONDecodeError as e:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)


class PendingRegistrationsView(generics.ListAPIView):
    """Get all pending member registrations"""
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            return MemberRegistration.objects.none()
        return MemberRegistration.objects.filter(status='pending', church__in=get_accessible_churches(user))


class ApproveRegistrationView(APIView):
    """Approve a member registration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        registration = get_object_or_404(MemberRegistration, pk=pk)
        
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response(
                {'error': 'You do not have permission to approve registrations'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not get_accessible_churches(user).filter(id=registration.church_id).exists():
            return Response(
                {'error': 'You do not have permission to approve registrations for this church'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if registration.status != 'pending':
            return Response(
                {'error': 'This registration has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate username from registration full name and a secure password.
        registration_name = (registration.personal_info or {}).get('full_name') or registration.user.full_name or 'member'
        generated_username = _generate_username_from_name(registration_name, exclude_user_id=registration.user_id)
        generated_password = _generate_secure_password(12)
        
        registration.status = 'approved'
        registration.approved_by = user
        registration.approved_at = timezone.now()
        registration.save()
        
        user_account = registration.user
        user_account.username = generated_username
        user_account.set_password(generated_password)
        user_account.church = registration.church
        user_account.is_approved = True
        user_account.is_active = True
        user_account.approved_by = user
        user_account.approved_at = timezone.now()
        user_account.save()
        
        try:
            create_notification(
                user_account,
                'Registration Approved',
                f'Your registration has been approved by {user.full_name}. Username: {generated_username}',
                'success'
            )
        except Exception as notify_error:
            logger.warning('Approval notification failed for user %s: %s', user_account.id, notify_error)

        if user_account.email:
            try:
                _send_approval_credentials_email(user_account, registration_name, generated_username, generated_password)
            except Exception as email_error:
                logger.warning('Approval email failed for user %s: %s', user_account.id, email_error)
        
        leaders = User.objects.filter(
            church=registration.church,
            role__in=LEADER_ROLES
        ).exclude(id=user.id)
        
        for leader in leaders:
            try:
                create_notification(
                    leader,
                    'Member Registration Approved',
                    f'{user_account.full_name} has been approved by {user.full_name}',
                    'info'
                )
            except Exception as notify_error:
                logger.warning('Leader approval notification failed for leader %s: %s', leader.id, notify_error)
        
        return Response({
            'message': 'Registration approved successfully',
            'registration_id': registration.id,
            'user_id': user_account.id,
            'username': generated_username,
        }, status=status.HTTP_200_OK)


class RejectRegistrationView(APIView):
    """Reject a member registration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        registration = get_object_or_404(MemberRegistration, pk=pk)
        rejection_reason = (request.data.get('rejection_reason') or '').strip()
        
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response(
                {'error': 'You do not have permission to reject registrations'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not get_accessible_churches(user).filter(id=registration.church_id).exists():
            return Response(
                {'error': 'You do not have permission to reject registrations for this church'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if registration.status != 'pending':
            return Response(
                {'error': 'This registration has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not rejection_reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration.status = 'rejected'
        registration.approved_by = user
        registration.approved_at = timezone.now()
        registration.rejection_reason = rejection_reason
        registration.save()
        
        user_account = registration.user
        user_account.is_active = False
        user_account.is_approved = False
        user_account.approved_by = user
        user_account.approved_at = timezone.now()
        user_account.save()
        
        try:
            create_notification(
                user_account,
                'Registration Rejected',
                f'Your registration has been rejected. Reason: {rejection_reason if rejection_reason else "No reason provided"}',
                'error'
            )
        except Exception as notify_error:
            logger.warning('Rejection notification failed for user %s: %s', user_account.id, notify_error)

        if user_account.email:
            try:
                send_email_notification(
                    'CFCT Registration Rejected',
                    (
                        f'Hello {user_account.get_full_name() or user_account.username},\n\n'
                        'Your registration was not approved at this time.\n'
                        f'Reason: {rejection_reason}\n\n'
                        'Please contact your church leadership for assistance.\n\n'
                        'Blessings,\nCFCT Management Team'
                    ),
                    [user_account.email],
                )
            except Exception as email_error:
                logger.warning('Rejection email failed for user %s: %s', user_account.id, email_error)
        
        return Response({
            'message': 'Registration rejected',
            'registration_id': registration.id
        }, status=status.HTTP_200_OK)


class RegistrationDetailView(generics.RetrieveAPIView):
    """Get detailed registration information"""
    queryset = MemberRegistration.objects.all()
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role not in LEADER_ROLES:
            return MemberRegistration.objects.none()
        return MemberRegistration.objects.filter(church__in=get_accessible_churches(user))


class DuplicateMembersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'You do not have permission to view duplicate members'}, status=status.HTTP_403_FORBIDDEN)

        accessible_churches = get_accessible_churches(user)
        scoped_users = User.objects.filter(church__in=accessible_churches, role__in=['local_member', 'local_leader'])

        duplicate_emails = (
            scoped_users
            .exclude(email__isnull=True)
            .exclude(email='')
            .values('email')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
            .order_by('-count')
        )

        duplicate_phones = (
            scoped_users
            .exclude(phone__isnull=True)
            .exclude(phone='')
            .values('phone')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
            .order_by('-count')
        )

        email_groups = []
        for entry in duplicate_emails:
            members = scoped_users.filter(email=entry['email']).values('id', 'username', 'full_name', 'church_id')
            email_groups.append({'email': entry['email'], 'count': entry['count'], 'members': list(members)})

        phone_groups = []
        for entry in duplicate_phones:
            members = scoped_users.filter(phone=entry['phone']).values('id', 'username', 'full_name', 'church_id')
            phone_groups.append({'phone': entry['phone'], 'count': entry['count'], 'members': list(members)})

        return Response({
            'duplicate_email_groups': email_groups,
            'duplicate_phone_groups': phone_groups,
            'total_duplicate_email_groups': len(email_groups),
            'total_duplicate_phone_groups': len(phone_groups),
        })


class BulkRegistrationActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'You do not have permission for bulk actions'}, status=status.HTTP_403_FORBIDDEN)

        registration_ids = request.data.get('registration_ids', [])
        action = request.data.get('action')
        rejection_reason = request.data.get('rejection_reason', '')

        if not isinstance(registration_ids, list) or not registration_ids:
            return Response({'error': 'registration_ids must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

        if action not in ['approve', 'reject']:
            return Response({'error': 'action must be approve or reject'}, status=status.HTTP_400_BAD_REQUEST)

        accessible_churches = get_accessible_churches(user)
        queryset = MemberRegistration.objects.filter(
            id__in=registration_ids,
            church__in=accessible_churches,
            status='pending'
        ).select_related('user', 'church')

        processed_ids = []
        skipped_ids = []

        for registration in queryset:
            user_account = registration.user
            if action == 'approve':
                registration_name = (registration.personal_info or {}).get('full_name') or user_account.full_name or 'member'
                generated_username = _generate_username_from_name(registration_name, exclude_user_id=registration.user_id)
                generated_password = _generate_secure_password(12)

                registration.status = 'approved'
                registration.approved_by = user
                registration.approved_at = timezone.now()
                registration.save(update_fields=['status', 'approved_by', 'approved_at'])

                user_account.username = generated_username
                user_account.set_password(generated_password)
                user_account.church = registration.church
                user_account.is_approved = True
                user_account.is_active = True
                user_account.approved_by = user
                user_account.approved_at = timezone.now()
                user_account.save(update_fields=['username', 'password', 'church', 'is_approved', 'is_active', 'approved_by', 'approved_at'])

                create_notification(
                    user_account,
                    'Registration Approved',
                    f'Your registration has been approved by {user.full_name}. Username: {generated_username}',
                    'success'
                )

                if user_account.email:
                    try:
                        _send_approval_credentials_email(user_account, registration_name, generated_username, generated_password)
                    except Exception as email_error:
                        logger.warning('Bulk approval email failed for user %s: %s', user_account.id, email_error)
            else:
                registration.status = 'rejected'
                registration.approved_by = user
                registration.approved_at = timezone.now()
                registration.rejection_reason = rejection_reason
                registration.save(update_fields=['status', 'approved_by', 'approved_at', 'rejection_reason'])

                user_account.is_active = False
                user_account.is_approved = False
                user_account.approved_by = user
                user_account.approved_at = timezone.now()
                user_account.save(update_fields=['is_active', 'is_approved', 'approved_by', 'approved_at'])

                create_notification(
                    user_account,
                    'Registration Rejected',
                    f'Your registration has been rejected. Reason: {rejection_reason if rejection_reason else "No reason provided"}',
                    'error'
                )

            processed_ids.append(registration.id)

        processed_set = set(processed_ids)
        for reg_id in registration_ids:
            if reg_id not in processed_set:
                skipped_ids.append(reg_id)

        return Response({
            'message': f'Bulk {action} completed',
            'processed_count': len(processed_ids),
            'skipped_count': len(skipped_ids),
            'processed_ids': processed_ids,
            'skipped_ids': skipped_ids,
        })


class RegistrationExportCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'You do not have permission to export registrations'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status')
        queryset = MemberRegistration.objects.filter(
            church__in=get_accessible_churches(user)
        ).select_related('user', 'church', 'approved_by')

        if status_filter in ['pending', 'approved', 'rejected']:
            queryset = queryset.filter(status=status_filter)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="member_registrations.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'registration_id',
            'full_name',
            'email',
            'phone',
            'church',
            'status',
            'submitted_at',
            'approved_by',
            'approved_at',
            'rejection_reason',
        ])

        for reg in queryset:
            personal = reg.personal_info or {}
            writer.writerow([
                reg.id,
                personal.get('full_name') or reg.user.full_name or reg.user.username,
                personal.get('email') or reg.user.email,
                personal.get('phone') or reg.user.phone,
                reg.church.name,
                reg.status,
                reg.created_at.isoformat(),
                reg.approved_by.full_name if reg.approved_by else '',
                reg.approved_at.isoformat() if reg.approved_at else '',
                reg.rejection_reason or '',
            ])

        return response


class MemberImportCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'You do not have permission to import members'}, status=status.HTTP_403_FORBIDDEN)

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'CSV file is required under field name file'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = csv_file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded_file))
        except Exception:
            return Response({'error': 'Invalid CSV file format'}, status=status.HTTP_400_BAD_REQUEST)

        accessible_churches = get_accessible_churches(user)
        accessible_ids = set(accessible_churches.values_list('id', flat=True))

        created_count = 0
        skipped_count = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            full_name = (row.get('full_name') or '').strip()
            email = (row.get('email') or '').strip().lower()
            phone = (row.get('phone') or '').strip()
            neighborhood = (row.get('neighborhood') or '').strip()
            church_id_raw = (row.get('church_id') or '').strip()

            if not full_name or not email or not phone:
                skipped_count += 1
                errors.append({'row': idx, 'error': 'full_name, email and phone are required'})
                continue

            if User.objects.filter(email=email).exists():
                skipped_count += 1
                errors.append({'row': idx, 'error': f'Email already exists: {email}'})
                continue

            church = user.church
            if church_id_raw:
                try:
                    church_id = int(church_id_raw)
                    if church_id not in accessible_ids:
                        skipped_count += 1
                        errors.append({'row': idx, 'error': f'church_id {church_id} is not in your scope'})
                        continue
                    church = Church.objects.get(id=church_id)
                except (ValueError, Church.DoesNotExist):
                    skipped_count += 1
                    errors.append({'row': idx, 'error': f'Invalid church_id: {church_id_raw}'})
                    continue

            base_username = email.split('@')[0] if '@' in email else email
            username = base_username or f'user_{int(timezone.now().timestamp())}'
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}{counter}'
                counter += 1

            with transaction.atomic():
                imported_user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=f'temp{int(timezone.now().timestamp())}',
                    full_name=full_name,
                    phone=phone,
                    role='local_member',
                    is_active=False,
                    is_approved=False,
                    church=church,
                    neighborhood=neighborhood,
                )
                MemberRegistration.objects.create(
                    user=imported_user,
                    church=church,
                    personal_info={
                        'full_name': full_name,
                        'email': email,
                        'phone': phone,
                        'neighborhood': neighborhood,
                    },
                    guardian_info={},
                    spiritual_info={},
                    status='pending',
                )
            created_count += 1

        return Response({
            'message': 'CSV import processed',
            'created_count': created_count,
            'skipped_count': skipped_count,
            'errors': errors,
        })


class MergeDuplicateMembersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in LEADER_ROLES:
            return Response({'error': 'You do not have permission to merge duplicate members'}, status=status.HTTP_403_FORBIDDEN)

        primary_user_id = request.data.get('primary_user_id')
        duplicate_user_id = request.data.get('duplicate_user_id')

        if not primary_user_id or not duplicate_user_id:
            return Response({'error': 'primary_user_id and duplicate_user_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        if str(primary_user_id) == str(duplicate_user_id):
            return Response({'error': 'primary and duplicate user must be different'}, status=status.HTTP_400_BAD_REQUEST)

        accessible_churches = get_accessible_churches(user)
        try:
            primary_user = User.objects.get(id=primary_user_id, church__in=accessible_churches)
            duplicate_user = User.objects.get(id=duplicate_user_id, church__in=accessible_churches)
        except User.DoesNotExist:
            return Response({'error': 'One or both users are outside your scope or do not exist'}, status=status.HTTP_404_NOT_FOUND)

        if primary_user.role not in ['local_member', 'local_leader'] or duplicate_user.role not in ['local_member', 'local_leader']:
            return Response({'error': 'Only local member/leader records can be merged'}, status=status.HTTP_400_BAD_REQUEST)

        merged_counts = {
            'prayer_requests': 0,
            'transfers': 0,
            'registrations_moved': 0,
        }

        with transaction.atomic():
            merged_counts['prayer_requests'] = PrayerRequest.objects.filter(member=duplicate_user).update(member=primary_user)
            merged_counts['transfers'] = Transfer.objects.filter(member=duplicate_user).update(member=primary_user)

            duplicate_registration = MemberRegistration.objects.filter(user=duplicate_user).first()
            primary_registration = MemberRegistration.objects.filter(user=primary_user).first()

            if duplicate_registration and not primary_registration:
                duplicate_registration.user = primary_user
                duplicate_registration.save(update_fields=['user'])
                merged_counts['registrations_moved'] = 1

            if not primary_user.phone and duplicate_user.phone:
                primary_user.phone = duplicate_user.phone
            if not primary_user.neighborhood and duplicate_user.neighborhood:
                primary_user.neighborhood = duplicate_user.neighborhood
            if not primary_user.guardian_name and duplicate_user.guardian_name:
                primary_user.guardian_name = duplicate_user.guardian_name
            if not primary_user.guardian_phone and duplicate_user.guardian_phone:
                primary_user.guardian_phone = duplicate_user.guardian_phone
            if not primary_user.guardian_relationship and duplicate_user.guardian_relationship:
                primary_user.guardian_relationship = duplicate_user.guardian_relationship
            primary_user.save()

            duplicate_user.is_active = False
            duplicate_user.is_approved = False
            if duplicate_user.email:
                duplicate_user.email = None
            duplicate_user.username = f'merged_{duplicate_user.id}_{duplicate_user.username}'
            duplicate_user.save(update_fields=['is_active', 'is_approved', 'email', 'username'])

        return Response({
            'message': 'Duplicate merge completed',
            'primary_user_id': primary_user.id,
            'duplicate_user_id': duplicate_user.id,
            'merged_counts': merged_counts,
        })
