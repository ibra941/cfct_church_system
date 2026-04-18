from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

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

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.GetCurrentUserView.as_view(), name='current_user'),
    path('events/popup/', views.PopupNewsView.as_view(), name='popup_news'),
    path('news/latest/', views.LatestNewsView.as_view(), name='latest_news'),
    
    # Additional endpoints for dashboard and reports
    path('members/registrations/pending/', views.PendingRegistrationsView.as_view(), name='pending_registrations'),
    path('audit-logs/', views.AuditLogsView.as_view(), name='audit_logs'),
    path('finance/monthly-summary/', views.MonthlySummaryView.as_view(), name='monthly_summary'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),
]