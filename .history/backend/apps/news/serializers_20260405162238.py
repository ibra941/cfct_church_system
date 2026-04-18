from rest_framework import serializers
from .models import NewsCategory, News

class NewsCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsCategory
        fields = '__all__'

class NewsSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    church_name = serializers.CharField(source='church.name', read_only=True)
    
    class Meta:
        model = News
        fields = '__all__'
        read_only_fields = ['id', 'view_count', 'share_count', 'created_at', 'updated_at']