from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'settings', views.SiteSettingViewSet)
router.register(r'homepage', views.HomePageContentViewSet)
router.register(r'social-links', views.SocialMediaLinkViewSet)
router.register(r'contact-info', views.ContactInfoViewSet)
router.register(r'footer-links', views.FooterLinkViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Public endpoints (no authentication required)
    path('public/settings/', views.PublicSiteSettingView.as_view(), name='public-settings'),
    path('public/homepage/', views.PublicHomePageContentView.as_view(), name='public-homepage'),
    path('public/social-links/', views.PublicSocialMediaLinkView.as_view(), name='public-social-links'),
    path('public/contact-info/', views.PublicContactInfoView.as_view(), name='public-contact-info'),
    path('public/footer-links/', views.PublicFooterLinkView.as_view(), name='public-footer-links'),
    
    # Dashboard stats
    path('dashboard/', views.CMSDashboardView.as_view(), name='cms-dashboard'),
]