from rest_framework import serializers
from .models import LeadershipHistory

class LeadershipHistorySerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_current_display = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = LeadershipHistory
        fields = [
            'id', 'church', 'church_name', 'leader', 'leader_name',
            'position', 'start_date', 'end_date', 'is_current', 'is_current_display',
            'appointment_letter', 'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_current_display(self, obj):
        return "Yes" if obj.is_current else "No"