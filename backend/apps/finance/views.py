from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from .models import FinancialTransaction
from .serializers import FinancialTransactionSerializer

class FinancialTransactionViewSet(viewsets.ModelViewSet):
    queryset = FinancialTransaction.objects.all()
    serializer_class = FinancialTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'national_leader':
            return FinancialTransaction.objects.all()
        return FinancialTransaction.objects.filter(church=user.church)

class FinancialSummaryView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        transactions = FinancialTransaction.objects.filter(church=request.user.church)
        
        total_income = transactions.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0
        total_expense = transactions.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0
        balance = total_income - total_expense
        
        return Response({
            'total_income': total_income,
            'total_expense': total_expense,
            'balance': balance
        })

class MonthlySummaryView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from datetime import datetime, timedelta
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=365)
        
        transactions = FinancialTransaction.objects.filter(
            church=request.user.church,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
        
        monthly_data = []
        current = start_date
        while current <= end_date:
            month_transactions = transactions.filter(
                transaction_date__year=current.year,
                transaction_date__month=current.month
            )
            monthly_data.append({
                'month': current.strftime('%B %Y'),
                'income': month_transactions.filter(transaction_type='income').aggregate(total=Sum('amount'))['total'] or 0,
                'expense': month_transactions.filter(transaction_type='expense').aggregate(total=Sum('amount'))['total'] or 0
            })
            current += timedelta(days=32)
            current = current.replace(day=1)
        
        return Response(monthly_data)