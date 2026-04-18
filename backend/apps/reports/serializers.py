from rest_framework import serializers
from .models import Report

class ReportSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.full_name', read_only=True)
    
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'file']