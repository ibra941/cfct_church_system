from rest_framework import serializers
from apps.accounts.models import User
from apps.churches.models import Church
from apps.events.models import Event
from apps.offerings.models import Offering
from apps.attendance.models import AttendanceRecord
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer
from apps.notifications.models import Notification
from apps.news.models import News
from apps.departments.models import Department
from .media_utils import build_absolute_media_url, normalize_media_list

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
    images = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_images(self, obj):
        request = self.context.get('request')
        return normalize_media_list(request, obj.images)

    def get_primary_image(self, obj):
        images = self.get_images(obj)
        return images[0] if images else None

class OfferingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True, allow_null=True, required=False)
    offering_type_display = serializers.CharField(source='get_offering_type_display', read_only=True)
    
    class Meta:
        model = Offering
        fields = '__all__'
        read_only_fields = ['id', 'receipt_no', 'created_at', 'church', 'recorded_by', 'verified_by', 'verified_at']
    
    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value


class AttendanceSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.full_name', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'
        read_only_fields = ['id', 'recorded_by', 'created_at', 'updated_at']

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
    featured_image = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = News
        fields = '__all__'
        read_only_fields = ['id', 'view_count', 'created_at', 'updated_at']

    def get_featured_image(self, obj):
        request = self.context.get('request')
        return build_absolute_media_url(request, obj.featured_image)

    def get_image_urls(self, obj):
        request = self.context.get('request')
        images = normalize_media_list(request, obj.images)
        featured_image = self.get_featured_image(obj)
        if featured_image:
            return [featured_image, *[image for image in images if image != featured_image]]
        return images

    def get_primary_image(self, obj):
        featured_image = self.get_featured_image(obj)
        if featured_image:
            return featured_image
        image_urls = self.get_image_urls(obj)
        return image_urls[0] if image_urls else None

class DepartmentSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']