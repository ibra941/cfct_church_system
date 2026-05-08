from rest_framework import serializers
from .models import Offering

class OfferingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True, allow_null=True, required=False)
    church_name = serializers.CharField(source='church.name', read_only=True)
    offering_type_display = serializers.CharField(source='get_offering_type_display', read_only=True)
    
    class Meta:
        model = Offering
        fields = '__all__'
        read_only_fields = ['id', 'receipt_no', 'created_at', 'recorded_by', 'verified_by', 'verified_at']
    
    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value
    
    def validate(self, data):
        """Validation for offerings"""
        # Member is optional
        if 'member' in data and data['member'] == '':
            data['member'] = None
        return data