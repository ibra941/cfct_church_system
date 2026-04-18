from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from apps.accounts.models import User
from apps.churches.models import Church
from apps.events.models import Event
from apps.offerings.models import Offering
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer
from apps.notifications.models import Notification
from apps.news.models import News
from apps.departments.models import Department
from .serializers import (
    UserSerializer, ChurchSerializer, EventSerializer, OfferingSerializer,
    PrayerSerializer, TransferSerializer, NotificationSerializer,
    NewsSerializer, DepartmentSerializer
)

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
    queryset = Church.objects.filter(is_active=True)
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return Church.objects.all()
        return Church.objects.filter(Q(id=user.church.id) | Q(parent_church=user.church))

class MemberViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role='local_member')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        queryset = Event.objects.all()
        if self.request.query_params.get('is_popup_news') == 'true':
            from django.utils import timezone
            queryset = queryset.filter(is_popup_news=True)
        return queryset

class OfferingViewSet(viewsets.ModelViewSet):
    queryset = Offering.objects.all()
    serializer_class = OfferingSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

class PrayerViewSet(viewsets.ModelViewSet):
    queryset = PrayerRequest.objects.all()
    serializer_class = PrayerSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def perform_create(self, serializer):
        serializer.save(member=self.request.user)

class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.all()
    serializer_class = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.filter(status='published')
    serializer_class = NewsSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class GetCurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class PopupNewsView(generics.ListAPIView):
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        from django.utils import timezone
        return Event.objects.filter(
            is_popup_news=True,
            start_date__lte=timezone.now()
        )[:3]

class LatestNewsView(generics.ListAPIView):
    serializer_class = NewsSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return News.objects.filter(status='published')[:5]