from rest_framework import serializers
from .models import PrayerRequest

class PrayerRequestSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = PrayerRequest
        fields = '__all__'
        read_only_fields = ['id', 'prayer_count', 'created_at', 'updated_at']