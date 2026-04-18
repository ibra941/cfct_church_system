from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q
from django.utils import timezone
from apps.accounts.models import User
from apps.churches.models import Church
from apps.members.models import MemberRegistration
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
        user_church = user.church
        
        # Role-based filtering
        if user.role == 'national_leader':
            # National leader sees all members
            return User.objects.filter(role__in=['local_member', 'local_leader'])
        
        elif user.role == 'zone_leader' and user_church:
            # Zone leader sees members in their zone and below
            zone_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church) |
                Q(parent_church__parent_church__parent_church=user_church)
            )
            return User.objects.filter(church__in=zone_churches, role__in=['local_member', 'local_leader'])
        
        elif user.role == 'regional_leader' and user_church:
            # Regional leader sees members in their region and below
            region_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church)
            )
            return User.objects.filter(church__in=region_churches, role__in=['local_member', 'local_leader'])
        
        elif user.role == 'district_leader' and user_church:
            # District leader sees members in their district and below
            district_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church)
            )
            return User.objects.filter(church__in=district_churches, role__in=['local_member', 'local_leader'])
        
        elif user_church:
            # Local leader or member sees only their church
            return User.objects.filter(church=user_church, role__in=['local_member', 'local_leader'])
        
        return User.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
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
        user_church = user.church

        def pending_count_for(churches_queryset=None):
            base = MemberRegistration.objects.filter(status='pending')
            if churches_queryset is not None:
                base = base.filter(church__in=churches_queryset)
            return base.count()
        
        # Initialize stats
        stats = {
            'total_members': 0,
            'total_churches': 0,
            'total_offerings': 0,
            'total_events': 0,
            'zones': 0,
            'regions': 0,
            'districts': 0,
            'locals': 0,
            'pending_approvals': 0,
            'monthly_growth': 12,
            'recent_members': []
        }

        # Drill-down context: national/zone/regional/district leaders can pass ?church_id=X
        context_church_id = request.query_params.get('church_id')
        if context_church_id and user.role in ['national_leader', 'zone_leader', 'regional_leader', 'district_leader']:
            try:
                ctx = Church.objects.get(id=context_church_id)
                ct = ctx.church_type
                if ct == 'zone':
                    scope = Church.objects.filter(
                        Q(id=ctx.id) | Q(parent_church=ctx) |
                        Q(parent_church__parent_church=ctx) |
                        Q(parent_church__parent_church__parent_church=ctx)
                    )
                    stats['total_churches'] = scope.count()
                    stats['total_members'] = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
                    stats['regions'] = Church.objects.filter(parent_church=ctx, church_type='region').count()
                    stats['districts'] = Church.objects.filter(parent_church__parent_church=ctx, church_type='district').count()
                    stats['locals'] = Church.objects.filter(parent_church__parent_church__parent_church=ctx, church_type='local').count()
                    stats['pending_approvals'] = pending_count_for(scope)
                    recent_members = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
                elif ct == 'region':
                    scope = Church.objects.filter(
                        Q(id=ctx.id) | Q(parent_church=ctx) | Q(parent_church__parent_church=ctx)
                    )
                    stats['total_churches'] = scope.count()
                    stats['total_members'] = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
                    stats['districts'] = Church.objects.filter(parent_church=ctx, church_type='district').count()
                    stats['locals'] = Church.objects.filter(parent_church__parent_church=ctx, church_type='local').count()
                    stats['pending_approvals'] = pending_count_for(scope)
                    recent_members = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
                elif ct == 'district':
                    scope = Church.objects.filter(Q(id=ctx.id) | Q(parent_church=ctx))
                    stats['total_churches'] = scope.count()
                    stats['total_members'] = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).count()
                    stats['locals'] = Church.objects.filter(parent_church=ctx, church_type='local').count()
                    stats['pending_approvals'] = pending_count_for(scope)
                    recent_members = User.objects.filter(church__in=scope, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
                elif ct == 'local':
                    local_qs = Church.objects.filter(id=ctx.id)
                    stats['total_churches'] = 1
                    stats['total_members'] = User.objects.filter(church=ctx, role__in=['local_member', 'local_leader']).count()
                    stats['pending_approvals'] = pending_count_for(local_qs)
                    recent_members = User.objects.filter(church=ctx, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
                else:
                    recent_members = []
                stats['recent_members'] = [
                    {'id': m.id, 'username': m.username, 'full_name': m.full_name, 'email': m.email, 'created_at': m.created_at}
                    for m in recent_members
                ]
                return Response(stats)
            except Church.DoesNotExist:
                pass  # Fall through to role-based logic

        # Role-based data filtering
        if user.role == 'national_leader':
            # National leader sees everything
            stats['total_members'] = User.objects.filter(role__in=['local_member', 'local_leader']).count()
            stats['total_churches'] = Church.objects.count()
            stats['zones'] = Church.objects.filter(church_type='zone').count()
            stats['regions'] = Church.objects.filter(church_type='region').count()
            stats['districts'] = Church.objects.filter(church_type='district').count()
            stats['locals'] = Church.objects.filter(church_type='local').count()
            stats['pending_approvals'] = pending_count_for()
            
            # Get recent members
            recent_members = User.objects.filter(role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
            
        elif user.role == 'zone_leader' and user_church and user_church.church_type == 'zone':
            # Zone leader sees only their zone and below
            zone_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church) |
                Q(parent_church__parent_church__parent_church=user_church)
            )
            stats['total_churches'] = zone_churches.count()
            stats['total_members'] = User.objects.filter(church__in=zone_churches, role__in=['local_member', 'local_leader']).count()
            stats['regions'] = Church.objects.filter(parent_church=user_church, church_type='region').count()
            stats['districts'] = Church.objects.filter(parent_church__parent_church=user_church, church_type='district').count()
            stats['locals'] = Church.objects.filter(parent_church__parent_church__parent_church=user_church, church_type='local').count()
            stats['zones'] = 1
            stats['pending_approvals'] = pending_count_for(zone_churches)
            
            # Get recent members in zone
            recent_members = User.objects.filter(church__in=zone_churches, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
            
        elif user.role == 'regional_leader' and user_church and user_church.church_type == 'region':
            # Regional leader sees only their region and below
            region_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church) |
                Q(parent_church__parent_church=user_church)
            )
            stats['total_churches'] = region_churches.count()
            stats['total_members'] = User.objects.filter(church__in=region_churches, role__in=['local_member', 'local_leader']).count()
            stats['districts'] = Church.objects.filter(parent_church=user_church, church_type='district').count()
            stats['locals'] = Church.objects.filter(parent_church__parent_church=user_church, church_type='local').count()
            stats['pending_approvals'] = pending_count_for(region_churches)
            
            # Get recent members in region
            recent_members = User.objects.filter(church__in=region_churches, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
            
        elif user.role == 'district_leader' and user_church and user_church.church_type == 'district':
            # District leader sees only their district and below
            district_churches = Church.objects.filter(
                Q(id=user_church.id) | 
                Q(parent_church=user_church)
            )
            stats['total_churches'] = district_churches.count()
            stats['total_members'] = User.objects.filter(church__in=district_churches, role__in=['local_member', 'local_leader']).count()
            stats['locals'] = Church.objects.filter(parent_church=user_church, church_type='local').count()
            stats['pending_approvals'] = pending_count_for(district_churches)
            
            # Get recent members in district
            recent_members = User.objects.filter(church__in=district_churches, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
            
        elif user_church:
            # Local leader or member sees only their church
            stats['total_churches'] = 1
            stats['total_members'] = User.objects.filter(church=user_church, role__in=['local_member', 'local_leader']).count()
            stats['pending_approvals'] = pending_count_for(Church.objects.filter(id=user_church.id)) if user.role == 'local_leader' else 0
            
            # Get recent members in local church
            recent_members = User.objects.filter(church=user_church, role__in=['local_member', 'local_leader']).order_by('-created_at')[:5]
        else:
            recent_members = []
        
        stats['recent_members'] = [
            {'id': m.id, 'username': m.username, 'full_name': m.full_name, 'email': m.email, 'created_at': m.created_at}
            for m in recent_members
        ]
        
        return Response(stats)

class ZoneListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Church.objects.filter(church_type='zone')
        if user.role == 'national_leader':
            return Church.objects.filter(church_type='zone')
        if not user.church:
            return Church.objects.none()
        return Church.objects.filter(id=user.church.id)  # Zone leaders see only their zone

class RegionListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id')
        if not user.is_authenticated:
            qs = Church.objects.filter(church_type='region')
        elif user.role == 'national_leader':
            qs = Church.objects.filter(church_type='region')
        elif user.role == 'zone_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='region', parent_church=user.church)
        elif user.role == 'regional_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(id=user.church.id)
        else:
            return Church.objects.none()
        if parent_id:
            qs = qs.filter(parent_church_id=parent_id)
        return qs

class DistrictListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id')
        if not user.is_authenticated:
            qs = Church.objects.filter(church_type='district')
        elif user.role == 'national_leader':
            qs = Church.objects.filter(church_type='district')
        elif user.role == 'zone_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='district', parent_church__parent_church=user.church)
        elif user.role == 'regional_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='district', parent_church=user.church)
        elif user.role == 'district_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(id=user.church.id)
        else:
            return Church.objects.none()
        if parent_id:
            qs = qs.filter(parent_church_id=parent_id)
        return qs

class LocalChurchListView(generics.ListAPIView):
    serializer_class = ChurchSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        parent_id = self.request.query_params.get('parent_id')
        if not user.is_authenticated:
            qs = Church.objects.filter(church_type='local')
        elif user.role == 'national_leader':
            qs = Church.objects.filter(church_type='local')
        elif user.role == 'zone_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='local', parent_church__parent_church__parent_church=user.church)
        elif user.role == 'regional_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='local', parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(church_type='local', parent_church=user.church)
        else:
            if not user.church:
                return Church.objects.none()
            qs = Church.objects.filter(id=user.church.id)
        if parent_id:
            qs = qs.filter(parent_church_id=parent_id)
        return qs

class ChurchHierarchyView(APIView):
    permission_classes = [permissions.AllowAny]
    
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