from rest_framework import serializers
from .models import Church

class ChurchSerializer(serializers.ModelSerializer):
    parent_church_name = serializers.CharField(source='parent_church.name', read_only=True)
    church_type_display = serializers.CharField(source='get_church_type_display', read_only=True)
    
    class Meta:
        model = Church
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class ChurchHierarchySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = Church
        fields = ['id', 'name', 'code', 'church_type', 'children']
    
    def get_children(self, obj):
        children = Church.objects.filter(parent_church=obj)
        return ChurchHierarchySerializer(children, many=True).data