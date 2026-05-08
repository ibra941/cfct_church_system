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
        # Auto-set church to user's church if not provided
        if not serializer.validated_data.get('church'):
            serializer.save(recorded_by=self.request.user, church=self.request.user.church)
        else:
            serializer.save(recorded_by=self.request.user)

class OfferingSummaryView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        # Get offerings based on user role
        if user.role == 'national_leader':
            offerings = Offering.objects.all()
        else:
            offerings = Offering.objects.filter(church=user.church)
        
        total = offerings.aggregate(total=Sum('amount'))['total'] or 0
        
        by_type = list(offerings.values('offering_type').annotate(total=Sum('amount')))
        
        return Response({
            'total': total,
            'by_type': by_type
        })