from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from django.db.models import Sum
from .models import Church
from .serializers import ChurchSerializer, ChurchHierarchySerializer

class ChurchViewSet(viewsets.ModelViewSet):
    queryset = Church.objects.all()
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return Church.objects.all()
        elif user.role == 'zone_leader':
            return Church.objects.filter(parent_church=user.church)
        elif user.role == 'regional_leader':
            return Church.objects.filter(parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            return Church.objects.filter(id=user.church.id)
        return Church.objects.filter(id=user.church.id)

class ChurchHierarchyView(generics.ListAPIView):
    serializer_class = ChurchHierarchySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Church.objects.filter(church_type='national')

class ChurchTopView(generics.ListAPIView):
    """Get top churches by offerings or members"""
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        limit = self.request.query_params.get('limit', 5)
        try:
            limit = int(limit)
        except ValueError:
            limit = 5
        
        user = self.request.user
        # Get base queryset based on user role
        if user.role == 'national_leader':
            queryset = Church.objects.all()
        elif user.role == 'zone_leader':
            queryset = Church.objects.filter(parent_church=user.church)
        elif user.role == 'regional_leader':
            queryset = Church.objects.filter(parent_church__parent_church=user.church)
        else:
            queryset = Church.objects.filter(id=user.church.id)
        
        # Sort by offerings (churches with most recent activity)
        queryset = queryset.annotate(
            total_offerings=Sum('offerings__amount')
        ).order_by('-total_offerings')[:limit]
        
        return queryset