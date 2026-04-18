# Custom permission classes
from rest_framework import permissions
class IsNationalLeader(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'national_leader'
