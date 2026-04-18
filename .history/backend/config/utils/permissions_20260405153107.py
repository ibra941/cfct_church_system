from rest_framework import permissions

class IsNationalLeader(permissions.BasePermission):
    """Allows access only to national leaders."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'national_leader'

class IsZoneLeader(permissions.BasePermission):
    """Allows access only to zone leaders."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'zone_leader'

class IsRegionalLeader(permissions.BasePermission):
    """Allows access only to regional leaders."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'regional_leader'

class IsDistrictLeader(permissions.BasePermission):
    """Allows access only to district leaders."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'district_leader'

class IsLocalLeader(permissions.BasePermission):
    """Allows access only to local leaders."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['local_leader', 'district_leader', 'regional_leader', 'zone_leader', 'national_leader']

class IsFinanceTeam(permissions.BasePermission):
    """Allows access only to finance team members."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'finance_team'

class IsAdminOrReadOnly(permissions.BasePermission):
    """Admin users have full access, others have read-only access."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_staff