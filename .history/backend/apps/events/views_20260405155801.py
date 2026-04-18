from rest_framework import viewsets, permissions
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
            from django.utils import timezone
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