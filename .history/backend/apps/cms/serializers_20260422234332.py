from rest_framework import serializers
from .models import SiteSetting, HomePageContent, SocialMediaLink, ContactInfo, FooterLink, ContactMessage

class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = ['id', 'key', 'value', 'setting_type', 'description']
        read_only_fields = ['id']


class HomePageContentSerializer(serializers.ModelSerializer):
    section_display = serializers.CharField(source='get_section_display', read_only=True)
    
    class Meta:
        model = HomePageContent
        fields = ['id', 'section', 'section_display', 'title', 'subtitle', 'content', 'image', 'order', 'is_active']
        read_only_fields = ['id']


class SocialMediaLinkSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)
    
    class Meta:
        model = SocialMediaLink
        fields = ['id', 'platform', 'platform_display', 'url', 'icon_class', 'order', 'is_active']
        read_only_fields = ['id']


class ContactInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInfo
        fields = ['id', 'contact_type', 'value', 'icon', 'order', 'is_active']
        read_only_fields = ['id']


class FooterLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = FooterLink
        fields = ['id', 'title', 'url', 'order', 'is_active']
        read_only_fields = ['id']


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_message(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Message is required.')
        return value