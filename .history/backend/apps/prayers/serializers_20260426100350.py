from rest_framework import serializers
from .models import PrayerRequest

class PrayerRequestSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_email = serializers.CharField(source='member.email', read_only=True)
    member_phone = serializers.CharField(source='member.phone', read_only=True)
    
    class Meta:
        model = PrayerRequest
        fields = '__all__'
        # member is assigned in PrayerViewSet.perform_create
        read_only_fields = ['id', 'member', 'prayer_count', 'created_at', 'updated_at']