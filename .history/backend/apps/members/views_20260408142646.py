from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import MemberRegistration
from .serializers import MemberRegistrationSerializer
from apps.accounts.models import User
from apps.churches.models import Church
from config.utils.notifications import create_notification

class MemberRegistrationViewSet(viewsets.ModelViewSet):
    queryset = MemberRegistration.objects.all()
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return MemberRegistration.objects.all()
        return MemberRegistration.objects.filter(church=user.church)


@method_decorator(csrf_exempt, name='dispatch')
class MemberRegisterView(generics.CreateAPIView):
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Disable authentication for this view
    
    def create(self, request, *args, **kwargs):
        print("=" * 50)
        print("REGISTRATION REQUEST RECEIVED")
        print("=" * 50)
        
        # Extract data from frontend format (no 'user' object)
        data = request.data
        personal_info = data.get('personal_info', {})
        guardian_info = data.get('guardian_info', {})
        spiritual_info = data.get('spiritual_info', {})
        preferred_church_id = data.get('preferred_church_id')
        
        print(f"Personal Info: {personal_info}")
        print(f"Guardian Info: {guardian_info}")
        print(f"Spiritual Info: {spiritual_info}")
        print(f"Preferred Church ID: {preferred_church_id}")
        
        # Validate required fields
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
        
        # Create username from email
        email = personal_info.get('email', '')
        username = email.split('@')[0] if email else f"user_{int(timezone.now().timestamp())}"
        
        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        # Get the selected church
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
        
        # Create user account
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=f"temp{int(timezone.now().timestamp())}",
                full_name=personal_info.get('full_name', ''),
                phone=personal_info.get('phone', ''),
                role='local_member',
                is_active=True,
                is_approved=False,
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
        
        # Create registration
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
            user.delete()  # Clean up user if registration fails
            return Response(
                {'error': f'Failed to create registration: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Notify church leaders
        leaders = User.objects.filter(
            church=church, 
            role__in=['district_leader', 'regional_leader', 'zone_leader', 'national_leader']
        )
        for leader in leaders:
            create_notification(
                leader,
                'New Member Registration',
                f'New member {user.full_name} has registered at {church.name}',
                'info'
            )
        
        return Response(
            {
                'message': 'Registration submitted successfully',
                'registration_id': registration.id,
                'user_id': user.id,
                'username': username
            },
            status=status.HTTP_201_CREATED
        )


class PendingRegistrationsView(generics.ListAPIView):
    """Get all pending member registrations"""
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = MemberRegistration.objects.filter(status='pending')
        
        if user.role == 'national_leader':
            return queryset
        elif user.role == 'zone_leader':
            return queryset.filter(church__parent_church=user.church)
        elif user.role == 'regional_leader':
            return queryset.filter(church__parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            return queryset.filter(church=user.church)
        elif user.role == 'local_leader':
            return queryset.filter(church=user.church)
        
        return queryset.none()


class ApproveRegistrationView(APIView):
    """Approve a member registration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        registration = get_object_or_404(MemberRegistration, pk=pk)
        
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader']:
            return Response(
                {'error': 'You do not have permission to approve registrations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if registration.status != 'pending':
            return Response(
                {'error': 'This registration has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration.status = 'approved'
        registration.approved_by = user
        registration.approved_at = timezone.now()
        registration.save()
        
        user_account = registration.user
        user_account.is_approved = True
        user_account.is_active = True
        user_account.approved_by = user
        user_account.approved_at = timezone.now()
        user_account.save()
        
        create_notification(
            user_account,
            'Registration Approved',
            f'Your registration has been approved by {user.full_name}. You can now log in to your account.',
            'success'
        )
        
        leaders = User.objects.filter(
            church=registration.church,
            role__in=['district_leader', 'regional_leader', 'zone_leader', 'national_leader']
        ).exclude(id=user.id)
        
        for leader in leaders:
            create_notification(
                leader,
                'Member Registration Approved',
                f'{user_account.full_name} has been approved by {user.full_name}',
                'info'
            )
        
        return Response({
            'message': 'Registration approved successfully',
            'registration_id': registration.id,
            'user_id': user_account.id
        }, status=status.HTTP_200_OK)


class RejectRegistrationView(APIView):
    """Reject a member registration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        registration = get_object_or_404(MemberRegistration, pk=pk)
        rejection_reason = request.data.get('rejection_reason', '')
        
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader']:
            return Response(
                {'error': 'You do not have permission to reject registrations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if registration.status != 'pending':
            return Response(
                {'error': 'This registration has already been processed'},
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
        
        create_notification(
            user_account,
            'Registration Rejected',
            f'Your registration has been rejected. Reason: {rejection_reason if rejection_reason else "No reason provided"}',
            'error'
        )
        
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
        if user.role == 'national_leader':
            return MemberRegistration.objects.all()
        return MemberRegistration.objects.filter(church=user.church)