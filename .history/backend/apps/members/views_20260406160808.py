from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import MemberRegistration
from .serializers import MemberRegistrationSerializer
from apps.accounts.models import User
from apps.config.utils.notifications import create_notification

class MemberRegistrationViewSet(viewsets.ModelViewSet):
    queryset = MemberRegistration.objects.all()
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return MemberRegistration.objects.all()
        return MemberRegistration.objects.filter(church=user.church)

class MemberRegisterView(generics.CreateAPIView):
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def perform_create(self, serializer):
        # Create user account first
        user_data = self.request.data.get('user')
        personal_info = self.request.data.get('personal_info', {})
        guardian_info = self.request.data.get('guardian_info', {})
        spiritual_info = self.request.data.get('spiritual_info', {})
        
        user = User.objects.create_user(
            username=user_data.get('username'),
            email=user_data.get('email'),
            password=user_data.get('password'),
            full_name=personal_info.get('full_name'),
            phone=personal_info.get('phone'),
            role='local_member',
            is_active=True,
            is_approved=False,
            neighborhood=personal_info.get('neighborhood', ''),
            guardian_name=guardian_info.get('guardian_name', ''),
            guardian_phone=guardian_info.get('guardian_phone', ''),
            guardian_relationship=guardian_info.get('relationship', ''),
            date_of_birth=spiritual_info.get('date_of_birth', None),
            christian_birth_date=spiritual_info.get('christian_birth_date', None),
            spiritual_gifts=spiritual_info.get('spiritual_gifts', []),
            ministry_interests=spiritual_info.get('ministry_interests', [])
        )
        
        registration = serializer.save(user=user)
        
        # Notify church leaders
        church = registration.church
        leaders = User.objects.filter(church=church, role__in=['district_leader', 'regional_leader', 'zone_leader', 'national_leader'])
        for leader in leaders:
            create_notification(
                leader,
                'New Member Registration',
                f'New member {user.full_name} has registered at {church.name}',
                'info'
            )


class PendingRegistrationsView(generics.ListAPIView):
    """Get all pending member registrations"""
    serializer_class = MemberRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = MemberRegistration.objects.filter(status='pending')
        
        # Filter based on user role
        if user.role == 'national_leader':
            return queryset
        elif user.role == 'zone_leader':
            # Zone leader can see registrations in their zone
            return queryset.filter(church__parent_church=user.church)
        elif user.role == 'regional_leader':
            # Regional leader can see registrations in their region
            return queryset.filter(church__parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            # District leader can see registrations in their district
            return queryset.filter(church=user.church)
        elif user.role == 'local_leader':
            # Local leader can see registrations in their local church
            return queryset.filter(church=user.church)
        
        return queryset.none()


class ApproveRegistrationView(APIView):
    """Approve a member registration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        registration = get_object_or_404(MemberRegistration, pk=pk)
        
        # Check if user has permission to approve
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader']:
            return Response(
                {'error': 'You do not have permission to approve registrations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if registration is for their church hierarchy
        if user.role == 'district_leader' and registration.church != user.church:
            return Response(
                {'error': 'You can only approve registrations for your district'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if registration.status != 'pending':
            return Response(
                {'error': 'This registration has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update registration
        registration.status = 'approved'
        registration.approved_by = user
        registration.approved_at = timezone.now()
        registration.save()
        
        # Update user account
        user_account = registration.user
        user_account.is_approved = True
        user_account.is_active = True
        user_account.approved_by = user
        user_account.approved_at = timezone.now()
        user_account.save()
        
        # Create notification for the user
        create_notification(
            user_account,
            'Registration Approved',
            f'Your registration has been approved by {user.full_name}. You can now log in to your account.',
            'success'
        )
        
        # Notify church leaders
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
        
        # Check if user has permission to reject
        user = request.user
        if user.role not in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_leader']:
            return Response(
                {'error': 'You do not have permission to reject registrations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if registration is for their church hierarchy
        if user.role == 'district_leader' and registration.church != user.church:
            return Response(
                {'error': 'You can only reject registrations for your district'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if registration.status != 'pending':
            return Response(
                {'error': 'This registration has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update registration
        registration.status = 'rejected'
        registration.approved_by = user
        registration.approved_at = timezone.now()
        registration.rejection_reason = rejection_reason
        registration.save()
        
        # Deactivate user account
        user_account = registration.user
        user_account.is_active = False
        user_account.is_approved = False
        user_account.approved_by = user
        user_account.approved_at = timezone.now()
        user_account.save()
        
        # Create notification for the user
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