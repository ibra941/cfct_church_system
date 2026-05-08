from rest_framework import serializers
from .models import Department, DepartmentMember

class DepartmentMemberSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_username = serializers.CharField(source='member.username', read_only=True)
    member_email = serializers.CharField(source='member.email', read_only=True)
    member_phone = serializers.CharField(source='member.phone', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = DepartmentMember
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    leader_email = serializers.CharField(source='leader.email', read_only=True)
    leader_phone = serializers.CharField(source='leader.phone', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    members = DepartmentMemberSerializer(source='department_members', many=True, read_only=True)
    
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']