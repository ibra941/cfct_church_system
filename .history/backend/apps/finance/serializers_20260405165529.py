from rest_framework import serializers
from .models import FinancialTransaction

class FinancialTransactionSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    
    class Meta:
        model = FinancialTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at']