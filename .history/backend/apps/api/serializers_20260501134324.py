from rest_framework import serializers
from apps.accounts.models import User
from apps.churches.models import Church, ChurchPageEntry, Sermon, ChurchPaymentDetails
from apps.events.models import Event
from apps.offerings.models import Offering
from apps.attendance.models import AttendanceCheckIn, AttendanceRecord
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer
from apps.notifications.models import Notification
from apps.news.models import News
from apps.departments.models import Department, DepartmentJoinRequest
from apps.events.models import EventRegistration
from .media_utils import build_absolute_media_url, normalize_media_list

class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, allow_null=True, write_only=True)
    profile_picture_url = serializers.SerializerMethodField(read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        return build_absolute_media_url(request, obj.profile_picture)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'phone',
            'profile_picture',
            'profile_picture_url',
            'role',
            'is_active',
            'is_approved',
            'church',
            'church_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

class ChurchSerializer(serializers.ModelSerializer):
    church_type_display = serializers.CharField(source='get_church_type_display', read_only=True)
    parent_church_name = serializers.CharField(source='parent_church.name', read_only=True)
    
    class Meta:
        model = Church
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChurchPaymentDetailsSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    mobile_money_numbers = serializers.SerializerMethodField()

    class Meta:
        model = ChurchPaymentDetails
        fields = [
            'id',
            'church',
            'church_name',
            'vodacom_lipa_number',
            'tigo_lipa_number',
            'airtel_lipa_number',
            'halotel_lipa_number',
            'bank_name',
            'bank_account_number',
            'bank_account_name',
            'bank_branch',
            'bank_swift_code',
            'mobile_money_numbers',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'church', 'church_name', 'created_at', 'updated_at', 'mobile_money_numbers']

    def get_mobile_money_numbers(self, obj):
        return {
            'vodacom': {'label': 'Vodacom M-Pesa', 'lipa_number': obj.vodacom_lipa_number},
            'tigo': {'label': 'Tigo Pesa', 'lipa_number': obj.tigo_lipa_number},
            'airtel': {'label': 'Airtel Money', 'lipa_number': obj.airtel_lipa_number},
            'halotel': {'label': 'Halopesa', 'lipa_number': obj.halotel_lipa_number},
        }

class EventSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    images = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['id', 'church', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'end_date': {'required': False, 'allow_null': True},
            'venue': {'required': False, 'allow_blank': True},
            'venue_address': {'required': False, 'allow_blank': True},
            'capacity': {'required': False, 'allow_null': True},
            'registration_deadline': {'required': False, 'allow_null': True},
            'fee': {'required': False, 'allow_null': True},
            'video_url': {'required': False, 'allow_blank': True},
            'organizer_name': {'required': False, 'allow_blank': True},
            'organizer_contact': {'required': False, 'allow_blank': True},
            'popup_start_date': {'required': False, 'allow_null': True},
            'popup_end_date': {'required': False, 'allow_null': True},
        }

    def get_images(self, obj):
        request = self.context.get('request')
        return normalize_media_list(request, obj.images)

    def get_primary_image(self, obj):
        images = self.get_images(obj)
        return images[0] if images else None

class OfferingSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True, allow_null=True, required=False)
    offering_type_display = serializers.CharField(source='get_offering_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = Offering
        fields = '__all__'
        read_only_fields = [
            'id', 'receipt_no', 'created_at', 'church', 'recorded_by',
            'verified_by', 'verified_at', 'payment_status',
        ]

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


class AttendanceCheckInSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)

    class Meta:
        model = AttendanceCheckIn
        fields = '__all__'
        read_only_fields = ['id', 'checked_in_at']

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


class DepartmentJoinRequestSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    church_name = serializers.CharField(source='department.church.name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)

    class Meta:
        model = DepartmentJoinRequest
        fields = '__all__'
        read_only_fields = ['id', 'member', 'requested_at', 'reviewed_at', 'reviewed_by']


class EventRegistrationSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_start_date = serializers.DateTimeField(source='event.start_date', read_only=True)

    class Meta:
        model = EventRegistration
        fields = '__all__'
        read_only_fields = ['id', 'member', 'registered_at']


class ChurchPageEntrySerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = ChurchPageEntry
        fields = [
            'id',
            'church',
            'church_name',
            'page_type',
            'title_en',
            'title_sw',
            'body_en',
            'body_sw',
            'order',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'church', 'created_by', 'created_at', 'updated_at']


class SermonSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Sermon
        fields = [
            'id',
            'church',
            'church_name',
            'title',
            'speaker',
            'sermon_date',
            'description',
            'scripture_reference',
            'audio_url',
            'video_url',
            'series_name',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'church', 'created_by', 'created_at', 'updated_at']