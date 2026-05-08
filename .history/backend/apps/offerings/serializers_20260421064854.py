from rest_framework import serializers
from .models import Offering

class OfferingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    offering_type_display = serializers.CharField(source='get_offering_type_display', read_only=True)
    
    class Meta:
        model = Offering
        fields = '__all__'
        read_only_fields = ['id', 'receipt_no', 'created_at', 'recorded_by', 'verified_by', 'verified_at']
    
    def validate(self, data):
        """Make church optional - it will be set from the request user"""
        if 'church' not in data or data['church'] is None:
            # Church will be set in perform_create
            pass
        return data