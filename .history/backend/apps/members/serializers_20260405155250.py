from rest_framework import serializers
from .models import MemberRegistration
from apps.accounts.serializers import UserSerializer

class MemberRegistrationSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = MemberRegistration
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']