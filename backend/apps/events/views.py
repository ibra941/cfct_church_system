from rest_framework import viewsets, permissions, generics
from django.utils import timezone
from .models import Event
from .serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.filter(is_active=True)
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Event.objects.filter(is_active=True)
        
        # Role-based filtering
        if user.role == 'national_leader':
            queryset = Event.objects.all()
        elif user.role == 'zone_leader':
            queryset = Event.objects.filter(church__parent_church=user.church)
        elif user.role == 'regional_leader':
            queryset = Event.objects.filter(church__parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            queryset = Event.objects.filter(church=user.church)
        else:
            queryset = Event.objects.filter(church=user.church)
        
        # Filter by popup news
        if self.request.query_params.get('is_popup_news') == 'true':
            queryset = queryset.filter(
                is_popup_news=True,
                popup_start_date__lte=timezone.now(),
                popup_end_date__gte=timezone.now()
            )
        
        # Filter by church
        church_id = self.request.query_params.get('church_id')
        if church_id:
            queryset = queryset.filter(church_id=church_id)
        
        # Filter by upcoming events
        if self.request.query_params.get('upcoming') == 'true':
            queryset = queryset.filter(start_date__gte=timezone.now())
        
        return queryset.order_by('-start_date')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PopupNewsView(generics.ListAPIView):
    """
    Get active popup news for homepage display.
    This endpoint is public (no authentication required).
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        now = timezone.now()
        return Event.objects.filter(
            is_popup_news=True,
            is_active=True,
            popup_start_date__lte=now,
            popup_end_date__gte=now
        ).order_by('-start_date')[:5]