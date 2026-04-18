from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from django.db.models import Sum
from .models import Offering
from .serializers import OfferingSerializer

class OfferingViewSet(viewsets.ModelViewSet):
    queryset = Offering.objects.all()
    serializer_class = OfferingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return Offering.objects.all()
        return Offering.objects.filter(church=user.church)
    
    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

class OfferingSummaryView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        offerings = Offering.objects.filter(church=request.user.church)
        
        total = offerings.aggregate(total=Sum('amount'))['total'] or 0
        
        by_type = offerings.values('offering_type').annotate(total=Sum('amount'))
        
        return Response({
            'total': total,
            'by_type': by_type
        })