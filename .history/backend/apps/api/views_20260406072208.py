from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from django.utils import timezone
from apps.accounts.models import User
from apps.churches.models import Church
from .serializers import (
    UserSerializer, ChurchSerializer
)

# Temporary empty response for missing models
class EmptyResponseMixin:
    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        return Response([])

    def create(self, request, *args, **kwargs):
        return Response({'message': 'Created'}, status=status.HTTP_201_CREATED)

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
        if user.role == 'national_leader':
            return Church.objects.all()
        return Church.objects.filter(Q(id=user.church_id) | Q(parent_church=user.church_id))

class MemberViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Member model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class EventViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Event model is created"""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

class OfferingViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Offering model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class PrayerViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Prayer model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class TransferViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Transfer model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class NotificationViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Notification model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class NewsViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when News model is created"""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

class DepartmentViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Department model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class GetCurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class PopupNewsView(generics.ListAPIView):
    serializer_class = ChurchSerializer  # Temporary placeholder
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Return empty list for now - will be implemented later
        return []
    
    def list(self, request, *args, **kwargs):
        return Response([])

class LatestNewsView(generics.ListAPIView):
    serializer_class = ChurchSerializer  # Temporary placeholder
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Return empty list for now - will be implemented later
        return []
    
    def list(self, request, *args, **kwargs):
        return Response([])

class PendingRegistrationsView(APIView):
    """Temporary view for pending registrations"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response([])

class AuditLogsView(APIView):
    """Temporary view for audit logs"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response([])

class MonthlySummaryView(APIView):
    """Temporary view for monthly financial summary"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response([])

class DashboardStatsView(APIView):
    """Dashboard statistics view"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        user = request.user
        data = {
            'total_members': User.objects.filter(church=user.church).count(),
            'total_churches': Church.objects.filter(Q(id=user.church_id) | Q(parent_church=user.church_id)).count(),
            'total_offerings': 0,
            'total_events': 0,
            'recent_members': []
        }
        return Response(data)