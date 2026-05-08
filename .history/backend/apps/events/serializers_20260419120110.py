from rest_framework import serializers
from django.utils import timezone
from .models import Event
from apps.api.media_utils import normalize_media_list

class EventSerializer(serializers.ModelSerializer):
    church_name = serializers.CharField(source='church.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    is_popup_active = serializers.SerializerMethodField(read_only=True)
    images = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_popup_active']
    
    def get_is_popup_active(self, obj):
        """Check if popup news is currently active"""
        if not obj.is_popup_news:
            return False
        now = timezone.now()
        if obj.popup_start_date and obj.popup_end_date:
            return obj.popup_start_date <= now <= obj.popup_end_date
        return False

    def get_images(self, obj):
        request = self.context.get('request')
        return normalize_media_list(request, obj.images)

    def get_primary_image(self, obj):
        images = self.get_images(obj)
        return images[0] if images else None