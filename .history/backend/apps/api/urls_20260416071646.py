from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from apps.cms.views import (
    SiteSettingViewSet, HomePageContentViewSet, SocialMediaLinkViewSet,
    ContactInfoViewSet, FooterLinkViewSet
)

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='api_users')
router.register(r'churches', views.ChurchViewSet, basename='api_churches')
router.register(r'members', views.MemberViewSet, basename='api_members')
router.register(r'events', views.EventViewSet, basename='api_events')
router.register(r'offerings', views.OfferingViewSet, basename='api_offerings')
router.register(r'prayers', views.PrayerViewSet, basename='api_prayers')
router.register(r'transfers', views.TransferViewSet, basename='api_transfers')
router.register(r'notifications', views.NotificationViewSet, basename='api_notifications')
router.register(r'news', views.NewsViewSet, basename='api_news')
router.register(r'departments', views.DepartmentViewSet, basename='api_departments')
router.register(r'cms-settings', SiteSettingViewSet, basename='cms_settings')
router.register(r'cms-homepage', HomePageContentViewSet, basename='cms_homepage')
router.register(r'cms-social-links', SocialMediaLinkViewSet, basename='cms_social_links')
router.register(r'cms-contact-info', ContactInfoViewSet, basename='cms_contact_info')
router.register(r'cms-footer-links', FooterLinkViewSet, basename='cms_footer_links')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', views.LoginTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/password-reset/request/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/me/', views.GetCurrentUserView.as_view(), name='current_user'),
    path('events/popup/', views.PopupNewsView.as_view(), name='popup_news'),
    path('news/latest/', views.LatestNewsView.as_view(), name='latest_news'),
    
    # Additional endpoints for dashboard and reports
    path('members/registrations/pending/', views.PendingRegistrationsView.as_view(), name='pending_registrations'),
    path('audit-logs/', views.AuditLogsView.as_view(), name='audit_logs'),
    path('finance/monthly-summary/', views.MonthlySummaryView.as_view(), name='monthly_summary'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # Role-based hierarchy endpoints
    path('zones/', views.ZoneListView.as_view(), name='zones'),
    path('regions/', views.RegionListView.as_view(), name='regions'),
    path('districts/', views.DistrictListView.as_view(), name='districts'),

    # Add these to urlpatterns
    path('locals/', views.LocalChurchListView.as_view(), name='locals'),
    path('hierarchy/', views.ChurchHierarchyView.as_view(), name='church_hierarchy'),
    path('stats/users/', views.UserRoleStatsView.as_view(), name='user_stats'),
    path('offerings/summary/', views.OfferingSummaryView.as_view(), name='offering_summary'),
    path('reports/export/<str:report_type>/', views.export_report_view, name='export_report'),

]