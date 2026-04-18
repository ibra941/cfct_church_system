from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from .models import Transfer
from .serializers import TransferSerializer

class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.all()
    serializer_class = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return Transfer.objects.all()
        return Transfer.objects.filter(from_church=user.church) | Transfer.objects.filter(to_church=user.church)
    
    def perform_create(self, serializer):
        serializer.save(member=self.request.user)

class ApproveTransferView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            transfer = Transfer.objects.get(pk=pk)
            user = request.user
            
            if transfer.from_church == user.church and user.role in ['district_leader', 'regional_leader', 'zone_leader', 'national_leader']:
                transfer.approved_by_from = user
            elif transfer.to_church == user.church and user.role in ['district_leader', 'regional_leader', 'zone_leader', 'national_leader']:
                transfer.approved_by_to = user
            else:
                return Response({'error': 'You are not authorized to approve this transfer'}, status=status.HTTP_403_FORBIDDEN)
            
            if transfer.approved_by_from and transfer.approved_by_to:
                transfer.status = 'approved'
                transfer.approval_date = timezone.now()
                # Update member's church
                transfer.member.church = transfer.to_church
                transfer.member.save()
            else:
                transfer.status = 'pending'
            
            transfer.save()
            return Response({'message': 'Transfer approved', 'status': transfer.status})
        except Transfer.DoesNotExist:
            return Response({'error': 'Transfer not found'}, status=status.HTTP_404_NOT_FOUND)