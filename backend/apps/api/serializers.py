from rest_framework import serializers
from apps.accounts.models import User
from apps.churches.models import Church
from apps.events.models import Event
from apps.offerings.models import Offering
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer
from apps.notifications.models import Notification
from apps.news.models import News
from apps.departments.models import Department

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'phone', 'role', 'is_active', 'is_approved', 'church', 'created_at']
        read_only_fields = ['id', 'created_at']

class ChurchSerializer(serializers.ModelSerializer):
    church_type_display = serializers.CharField(source='get_church_type_display', read_only=True)
    
    class Meta:
        model = Church
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class EventSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class OfferingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    offering_type_display = serializers.CharField(source='get_offering_type_display', read_only=True)
    
    class Meta:
        model = Offering
        fields = '__all__'
        read_only_fields = ['id', 'receipt_number', 'created_at']

class PrayerSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = PrayerRequest
        fields = '__all__'
        read_only_fields = ['id', 'prayer_count', 'created_at']

class TransferSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = Transfer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class NewsSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = News
        fields = '__all__'
        read_only_fields = ['id', 'view_count', 'created_at', 'updated_at']

class DepartmentSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']