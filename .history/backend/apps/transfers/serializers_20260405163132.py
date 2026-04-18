from rest_framework import serializers
from .models import Transfer

class TransferSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    from_church_name = serializers.CharField(source='from_church.name', read_only=True)
    to_church_name = serializers.CharField(source='to_church.name', read_only=True)
    
    class Meta:
        model = Transfer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']