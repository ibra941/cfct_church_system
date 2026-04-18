from rest_framework import serializers
from .models import LeadershipHistory

class LeadershipHistorySerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    
    class Meta:
        model = LeadershipHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']