from rest_framework import viewsets, permissions, generics
from django.utils import timezone
from .models import Event
from .serializers import EventSerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.filter(is_active=True)
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Event.objects.filter(is_active=True)
        
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
        
        return queryset


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
        ).order_by('-start_date')[:5]  # Limit to 5 most recent