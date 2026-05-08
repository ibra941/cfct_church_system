from rest_framework import serializers
from .models import Transfer

class TransferSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_email = serializers.CharField(source='member.email', read_only=True)
    member_phone = serializers.CharField(source='member.phone', read_only=True)
    from_church_name = serializers.CharField(source='from_church.name', read_only=True)
    to_church_name = serializers.CharField(source='to_church.name', read_only=True)
    recommendation_letter_url = serializers.SerializerMethodField(read_only=True)

    def get_recommendation_letter_url(self, obj):
        request = self.context.get('request')
        if not obj.recommendation_letter:
            return None
        if request is None:
            return obj.recommendation_letter.url
        return request.build_absolute_uri(obj.recommendation_letter.url)
    
    class Meta:
        model = Transfer
        fields = '__all__'
        read_only_fields = [
            'id',
            'member',
            'from_church',
            'status',
            'approved_by_from',
            'approved_by_to',
            'approval_date',
            'created_at',
            'updated_at',
        ]