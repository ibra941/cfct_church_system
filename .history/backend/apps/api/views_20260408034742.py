from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from django.utils import timezone
from apps.accounts.models import User
from apps.churches.models import Church
from .serializers import (
    UserSerializer, ChurchSerializer
)

# Temporary empty response for missing models
class EmptyResponseMixin:
    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        return Response([])

    def create(self, request, *args, **kwargs):
        return Response({'message': 'Created'}, status=status.HTTP_201_CREATED)

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
    queryset = Church.objects.all()
    serializer_class = ChurchSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return Church.objects.all()
        return Church.objects.filter(Q(id=user.church_id) | Q(parent_church=user.church_id))

class MemberViewSet(viewsets.ModelViewSet):
    """View for church members (users with member roles)"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        user = self.request.user
        # Return users based on role hierarchy
        if user.role == 'national_leader':
            return User.objects.all()
        elif user.role == 'zone_leader':
            return User.objects.filter(church__parent_church=user.church)
        elif user.role == 'regional_leader':
            return User.objects.filter(church__parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            return User.objects.filter(church=user.church)
        # For local leaders and members, return users in their church
        return User.objects.filter(church=user.church)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Apply pagination if needed
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class EventViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Event model is created"""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

class OfferingViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Offering model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class PrayerViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Prayer model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class TransferViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Transfer model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class NotificationViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Notification model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class NewsViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when News model is created"""
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    authentication_classes = [JWTAuthentication]

class DepartmentViewSet(EmptyResponseMixin, viewsets.ModelViewSet):
    """Temporary view - will be implemented when Department model is created"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

class GetCurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class PopupNewsView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return []
    
    def list(self, request, *args, **kwargs):
        return Response([])

class LatestNewsView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return []
    
    def list(self, request, *args, **kwargs):
        return Response([])

class PendingRegistrationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response([])

class AuditLogsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response([])

class MonthlySummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        return Response([])

class OfferingSummaryView(APIView):
    """Get offering summary by type"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        from apps.offerings.models import Offering
        from django.db.models import Sum
        
        offerings = Offering.objects.filter(church=request.user.church)
        
        summary = []
        for offering_type, _ in Offering.OFFERING_TYPES:
            total = offerings.filter(offering_type=offering_type).aggregate(total=Sum('amount'))['total'] or 0
            if total > 0:
                summary.append({
                    'type': offering_type,
                    'total': total
                })
        
        return Response(summary)    

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        user = request.user
        data = {
            'total_members': User.objects.filter(church=user.church).count(),
            'total_churches': Church.objects.filter(Q(id=user.church_id) | Q(parent_church=user.church_id)).count(),
            'total_offerings': 0,
            'total_events': 0,
            'recent_members': []
        }
        return Response(data)

class ZoneListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        zones = Church.objects.filter(church_type='zone')
        serializer = ChurchSerializer(zones, many=True)
        return Response(serializer.data)

class RegionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        regions = Church.objects.filter(church_type='region')
        serializer = ChurchSerializer(regions, many=True)
        return Response(serializer.data)

class DistrictListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        districts = Church.objects.filter(church_type='district')
        serializer = ChurchSerializer(districts, many=True)
        return Response(serializer.data)

class LocalChurchListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        local_churches = Church.objects.filter(church_type='local')
        serializer = ChurchSerializer(local_churches, many=True)
        return Response(serializer.data)

class ChurchHierarchyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        national = Church.objects.filter(church_type='national').first()
        if not national:
            return Response({'error': 'National church not found'}, status=404)
        
        hierarchy = {
            'id': national.id,
            'name': national.name,
            'type': national.church_type,
            'zones': []
        }
        
        zones = Church.objects.filter(parent_church=national, church_type='zone')
        for zone in zones:
            zone_data = {
                'id': zone.id,
                'name': zone.name,
                'type': zone.church_type,
                'regions': []
            }
            regions = Church.objects.filter(parent_church=zone, church_type='region')
            for region in regions:
                region_data = {
                    'id': region.id,
                    'name': region.name,
                    'type': region.church_type,
                    'districts': []
                }
                districts = Church.objects.filter(parent_church=region, church_type='district')
                for district in districts:
                    district_data = {
                        'id': district.id,
                        'name': district.name,
                        'type': district.church_type,
                        'locals': []
                    }
                    locals_churches = Church.objects.filter(parent_church=district, church_type='local')
                    district_data['locals'] = [
                        {'id': l.id, 'name': l.name, 'type': l.church_type}
                        for l in locals_churches
                    ]
                    region_data['districts'].append(district_data)
                zone_data['regions'].append(region_data)
            hierarchy['zones'].append(zone_data)
        
        return Response(hierarchy)

class UserRoleStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        stats = {
            'national_leaders': User.objects.filter(role='national_leader').count(),
            'zone_leaders': User.objects.filter(role='zone_leader').count(),
            'regional_leaders': User.objects.filter(role='regional_leader').count(),
            'district_leaders': User.objects.filter(role='district_leader').count(),
            'local_leaders': User.objects.filter(role='local_leader').count(),
            'local_members': User.objects.filter(role='local_member').count(),
            'finance_team': User.objects.filter(role='finance_team').count(),
            'total': User.objects.count(),
            'pending_approvals': User.objects.filter(is_approved=False, is_active=True).count()
        }
        return Response(stats)