from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone
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
        user = User.objects.create_user(
            username=user_data.get('username'),
            email=user_data.get('email'),
            password=user_data.get('password'),
            full_name=user_data.get('full_name'),
            phone=user_data.get('phone'),
            role='local_member',
            is_active=True,
            is_approved=False
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