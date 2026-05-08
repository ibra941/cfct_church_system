from rest_framework import serializers
from .models import NewsCategory, News
from apps.api.media_utils import build_absolute_media_url, normalize_media_list

class NewsCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsCategory
        fields = '__all__'

class NewsSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    featured_image = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = News
        fields = '__all__'
        read_only_fields = [
            'id',
            'slug',
            'church',
            'author',
            'view_count',
            'share_count',
            'published_at',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'category': {'required': False, 'allow_null': True},
            'featured_image': {'required': False, 'allow_null': True},
            'excerpt': {'required': False, 'allow_blank': True},
        }

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