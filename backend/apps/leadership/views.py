from rest_framework import viewsets, generics, permissions
from .models import LeadershipHistory
from .serializers import LeadershipHistorySerializer

class LeadershipHistoryViewSet(viewsets.ModelViewSet):
    queryset = LeadershipHistory.objects.all()
    serializer_class = LeadershipHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return LeadershipHistory.objects.all()
        return LeadershipHistory.objects.filter(church=user.church)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class CurrentLeadershipView(generics.ListAPIView):
    serializer_class = LeadershipHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LeadershipHistory.objects.filter(is_current=True)