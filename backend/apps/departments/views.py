from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from .models import Department, DepartmentMember
from .serializers import DepartmentSerializer, DepartmentMemberSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return Department.objects.all()
        return Department.objects.filter(church=user.church)
    
    def perform_create(self, serializer):
        serializer.save()

class AddDepartmentMemberView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            department = Department.objects.get(pk=pk)
            member_id = request.data.get('member_id')
            role = request.data.get('role', 'member')
            
            member = User.objects.get(id=member_id)
            
            department_member, created = DepartmentMember.objects.get_or_create(
                department=department,
                member=member,
                defaults={'role': role}
            )
            
            if not created:
                department_member.role = role
                department_member.save()
            
            return Response({'message': 'Member added to department'}, status=status.HTTP_200_OK)
        except Department.DoesNotExist:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)