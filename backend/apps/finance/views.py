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
        from django.db.models import Q
        from apps.churches.models import Church
        from apps.offerings.models import Offering
        
        # Get all accessible churches for the user (multi-level hierarchy support)
        user = request.user
        if user.role == 'national_leader':
            churches = Church.objects.all()
        elif user.church:
            # Get all churches in user's hierarchy based on their role
            base_church = user.church
            if user.role == 'zone_leader':
                churches = Church.objects.filter(
                    Q(id=base_church.id) |
                    Q(parent_church=base_church) |
                    Q(parent_church__parent_church=base_church) |
                    Q(parent_church__parent_church__parent_church=base_church)
                )
            elif user.role == 'regional_leader':
                churches = Church.objects.filter(
                    Q(id=base_church.id) |
                    Q(parent_church=base_church) |
                    Q(parent_church__parent_church=base_church)
                )
            elif user.role == 'district_leader':
                churches = Church.objects.filter(
                    Q(id=base_church.id) | Q(parent_church=base_church)
                )
            else:
                churches = Church.objects.filter(id=base_church.id)
        else:
            churches = Church.objects.none()
        
        # Get offerings with valid payment dates
        offerings = Offering.objects.filter(church__in=churches, payment_date__isnull=False)
        
        # Build monthly summary
        monthly_totals = {}
        for offering in offerings:
            if offering.payment_date:
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