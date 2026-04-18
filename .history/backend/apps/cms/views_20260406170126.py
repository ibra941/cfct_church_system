from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import SiteSetting, HomePageContent, SocialMediaLink, ContactInfo, FooterLink
from .serializers import (
    SiteSettingSerializer, HomePageContentSerializer,
    SocialMediaLinkSerializer, ContactInfoSerializer, FooterLinkSerializer
)


class SiteSettingViewSet(viewsets.ModelViewSet):
    queryset = SiteSetting.objects.all()
    serializer_class = SiteSettingSerializer
    permission_classes = [permissions.IsAuthenticated]


class PublicSiteSettingView(generics.ListAPIView):
    """Public endpoint for site settings (no auth required)"""
    serializer_class = SiteSettingSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return SiteSetting.objects.all()


class HomePageContentViewSet(viewsets.ModelViewSet):
    queryset = HomePageContent.objects.filter(is_active=True)
    serializer_class = HomePageContentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return HomePageContent.objects.all()
        return HomePageContent.objects.filter(is_active=True)


class PublicHomePageContentView(generics.ListAPIView):
    """Public endpoint for homepage content (no auth required)"""
    serializer_class = HomePageContentSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return HomePageContent.objects.filter(is_active=True).order_by('order')


class SocialMediaLinkViewSet(viewsets.ModelViewSet):
    queryset = SocialMediaLink.objects.filter(is_active=True)
    serializer_class = SocialMediaLinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return SocialMediaLink.objects.all()
        return SocialMediaLink.objects.filter(is_active=True)


class PublicSocialMediaLinkView(generics.ListAPIView):
    """Public endpoint for social media links (no auth required)"""
    serializer_class = SocialMediaLinkSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return SocialMediaLink.objects.filter(is_active=True).order_by('order')


class ContactInfoViewSet(viewsets.ModelViewSet):
    queryset = ContactInfo.objects.filter(is_active=True)
    serializer_class = ContactInfoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return ContactInfo.objects.all()
        return ContactInfo.objects.filter(is_active=True)


class PublicContactInfoView(generics.ListAPIView):
    """Public endpoint for contact info (no auth required)"""
    serializer_class = ContactInfoSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return ContactInfo.objects.filter(is_active=True).order_by('order')


class FooterLinkViewSet(viewsets.ModelViewSet):
    queryset = FooterLink.objects.filter(is_active=True)
    serializer_class = FooterLinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return FooterLink.objects.all()
        return FooterLink.objects.filter(is_active=True)


class PublicFooterLinkView(generics.ListAPIView):
    """Public endpoint for footer links (no auth required)"""
    serializer_class = FooterLinkSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return FooterLink.objects.filter(is_active=True).order_by('order')


class CMSDashboardView(APIView):
    """Get CMS dashboard statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        data = {
            'total_settings': SiteSetting.objects.count(),
            'total_homepage_sections': HomePageContent.objects.count(),
            'active_sections': HomePageContent.objects.filter(is_active=True).count(),
            'total_social_links': SocialMediaLink.objects.count(),
            'active_social_links': SocialMediaLink.objects.filter(is_active=True).count(),
            'total_contact_info': ContactInfo.objects.count(),
            'total_footer_links': FooterLink.objects.count(),
        }
        return Response(data)