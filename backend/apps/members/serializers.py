from rest_framework import serializers
from .models import MemberRegistration
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User
from apps.churches.models import Church

class MemberRegistrationSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    personal_info = serializers.JSONField(required=False, default=dict)
    guardian_info = serializers.JSONField(required=False, default=dict)
    spiritual_info = serializers.JSONField(required=False, default=dict)
    
    class Meta:
        model = MemberRegistration
        fields = [
            'id', 'user', 'user_details', 'church', 'church_name',
            'personal_info', 'guardian_info', 'spiritual_info',
            'status', 'approved_by', 'approved_by_name', 'approved_at',
            'rejection_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_at', 'rejection_reason']
    
    def create(self, validated_data):
        # Extract nested data
        personal_info = validated_data.pop('personal_info', {})
        guardian_info = validated_data.pop('guardian_info', {})
        spiritual_info = validated_data.pop('spiritual_info', {})
        
        # Create registration
        registration = MemberRegistration.objects.create(
            personal_info=personal_info,
            guardian_info=guardian_info,
            spiritual_info=spiritual_info,
            **validated_data
        )
        
        return registration
    
    def update(self, instance, validated_data):
        # Update personal_info if provided
        if 'personal_info' in validated_data:
            personal_info = validated_data['personal_info']
            instance.personal_info.update(personal_info)
            
            # Sync with User model
            user = instance.user
            if 'full_name' in personal_info:
                user.full_name = personal_info['full_name']
            if 'email' in personal_info:
                user.email = personal_info['email']
            if 'phone' in personal_info:
                user.phone = personal_info['phone']
            user.save()

        # Update guardian_info if provided
        if 'guardian_info' in validated_data:
            instance.guardian_info.update(validated_data['guardian_info'])

        # Update spiritual_info if provided
        if 'spiritual_info' in validated_data:
            spiritual_info = validated_data['spiritual_info']
            instance.spiritual_info.update(spiritual_info)
            
            # Sync spiritual info with User model
            user = instance.user
            if 'date_of_birth' in spiritual_info:
                user.date_of_birth = spiritual_info['date_of_birth']
            if 'christian_birth_date' in spiritual_info:
                user.christian_birth_date = spiritual_info['christian_birth_date']
            if 'spiritual_gifts' in spiritual_info:
                user.spiritual_gifts = spiritual_info['spiritual_gifts']
            if 'ministry_interests' in spiritual_info:
                user.ministry_interests = spiritual_info['ministry_interests']
            user.save()

        # Update other fields
        instance.status = validated_data.get('status', instance.status)
        instance.approved_by = validated_data.get('approved_by', instance.approved_by)
        instance.approved_at = validated_data.get('approved_at', instance.approved_at)
        instance.rejection_reason = validated_data.get('rejection_reason', instance.rejection_reason)
        
        instance.save()
        return instance


class MemberRegistrationCreateSerializer(serializers.Serializer):
    """Serializer for creating a new member registration"""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    
    # Personal Information
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    neighborhood = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    # Guardian Information
    guardian_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    guardian_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    guardian_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Spiritual Information
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    christian_birth_date = serializers.DateField(required=False, allow_null=True)
    spiritual_gifts = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    ministry_interests = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    
    # Church selection
    preferred_church_id = serializers.IntegerField()
    
    def validate_preferred_church_id(self, value):
        try:
            church = Church.objects.get(id=value)
            return church
        except Church.DoesNotExist:
            raise serializers.ValidationError("Selected church does not exist")
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value
    
    def create(self, validated_data):
        # Extract user data
        user_data = {
            'username': validated_data.pop('username'),
            'email': validated_data.pop('email'),
            'password': validated_data.pop('password'),
        }
        
        # Extract personal info
        personal_info = {
            'full_name': validated_data.pop('full_name'),
            'phone': validated_data.pop('phone'),
            'neighborhood': validated_data.pop('neighborhood', ''),
        }
        
        # Extract guardian info
        guardian_info = {
            'guardian_name': validated_data.pop('guardian_name', ''),
            'guardian_phone': validated_data.pop('guardian_phone', ''),
            'relationship': validated_data.pop('guardian_relationship', ''),
        }
        
        # Extract spiritual info
        spiritual_info = {
            'date_of_birth': validated_data.pop('date_of_birth', None),
            'christian_birth_date': validated_data.pop('christian_birth_date', None),
            'spiritual_gifts': validated_data.pop('spiritual_gifts', []),
            'ministry_interests': validated_data.pop('ministry_interests', []),
        }
        
        # Get church
        church = validated_data.pop('preferred_church_id')
        
        # Create user
        user = User.objects.create_user(
            username=user_data['username'],
            email=user_data['email'],
            password=user_data['password'],
            full_name=personal_info['full_name'],
            phone=personal_info['phone'],
            role='local_member',
            is_active=True,
            is_approved=False,
            neighborhood=personal_info['neighborhood'],
            guardian_name=guardian_info['guardian_name'],
            guardian_phone=guardian_info['guardian_phone'],
            guardian_relationship=guardian_info['relationship'],
            date_of_birth=spiritual_info['date_of_birth'],
            christian_birth_date=spiritual_info['christian_birth_date'],
            spiritual_gifts=spiritual_info['spiritual_gifts'],
            ministry_interests=spiritual_info['ministry_interests']
        )
        
        # Create registration
        registration = MemberRegistration.objects.create(
            user=user,
            church=church,
            personal_info=personal_info,
            guardian_info=guardian_info,
            spiritual_info=spiritual_info,
            status='pending'
        )
        
        return registration


class RegistrationApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting registrations"""
    rejection_reason = serializers.CharField(required=False, allow_blank=True)