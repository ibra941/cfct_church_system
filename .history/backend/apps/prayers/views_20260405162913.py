from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from .models import PrayerRequest
from .serializers import PrayerRequestSerializer

class PrayerRequestViewSet(viewsets.ModelViewSet):
    queryset = PrayerRequest.objects.all()
    serializer_class = PrayerRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return PrayerRequest.objects.all()
        return PrayerRequest.objects.filter(is_public=True) | PrayerRequest.objects.filter(member=user)
    
    def perform_create(self, serializer):
        serializer.save(member=self.request.user)

class PrayForRequestView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            prayer = PrayerRequest.objects.get(pk=pk)
            prayer.prayer_count += 1
            prayer.save()
            return Response({'message': 'Prayer recorded'}, status=status.HTTP_200_OK)
        except PrayerRequest.DoesNotExist:
            return Response({'error': 'Prayer request not found'}, status=status.HTTP_404_NOT_FOUND)