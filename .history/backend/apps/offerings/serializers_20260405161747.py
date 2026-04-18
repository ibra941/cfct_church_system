from rest_framework import serializers
from .models import Offering

class OfferingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    offering_type_display = serializers.CharField(source='get_offering_type_display', read_only=True)
    
    class Meta:
        model = Offering
        fields = '__all__'
        read_only_fields = ['id', 'receipt_number', 'created_at']