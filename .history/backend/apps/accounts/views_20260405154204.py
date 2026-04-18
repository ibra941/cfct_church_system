from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer, UserCreateSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return User.objects.all()
        elif user.role == 'zone_leader':
            return User.objects.filter(church__parent_church=user.church)
        elif user.role == 'regional_leader':
            return User.objects.filter(church__parent_church__parent_church=user.church)
        elif user.role == 'district_leader':
            return User.objects.filter(church=user.church)
        return User.objects.filter(id=user.id)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user