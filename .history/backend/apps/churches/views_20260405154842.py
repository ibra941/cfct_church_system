from rest_framework import viewsets, generics, permissions
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