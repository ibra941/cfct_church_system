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
        from apps.api.views import get_accessible_churches
        
        # Use accessible churches (not just request.user.church) for multi-level access
        churches = get_accessible_churches(request.user)
        
        # Get offerings instead of financial transactions
        from apps.offerings.models import Offering
        offerings = Offering.objects.filter(church__in=churches, payment_date__isnull=False)
        
        # Build monthly summary
        monthly_totals = {}
        for offering in offerings:
            if offering.payment_date:  # Skip offerings with no payment_date
                month_key = offering.payment_date.strftime('%b %Y')
                monthly_totals[month_key] = monthly_totals.get(month_key, 0) + float(offering.amount or 0)
        
        monthly_income = [
            {'month': month, 'amount': amount}
            for month, amount in sorted(monthly_totals.items())
        ]
        
        # Group by offering type
        offerings_by_type = [
            {'type': row['offering_type'], 'amount': float(row['amount'] or 0)}
            for row in offerings.values('offering_type').annotate(amount=Sum('amount'))
        ]
        
        return Response({
            'monthly_income': monthly_income,
            'offerings_by_type': offerings_by_type,
            'total_income': sum(item['amount'] for item in monthly_income),
        })