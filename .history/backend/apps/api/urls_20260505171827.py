from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from apps.cms.views import (
    SiteSettingViewSet, HomePageContentViewSet, SocialMediaLinkViewSet,
    ContactInfoViewSet, FooterLinkViewSet, PublicContactMessageCreateView
)

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='api_users')
router.register(r'churches', views.ChurchViewSet, basename='api_churches')
router.register(r'members', views.MemberViewSet, basename='api_members')
router.register(r'events', views.EventViewSet, basename='api_events')
router.register(r'offerings', views.OfferingViewSet, basename='api_offerings')
router.register(r'attendance', views.AttendanceViewSet, basename='api_attendance')
router.register(r'prayers', views.PrayerViewSet, basename='api_prayers')
router.register(r'transfers', views.TransferViewSet, basename='api_transfers')
router.register(r'notifications', views.NotificationViewSet, basename='api_notifications')
router.register(r'news', views.NewsViewSet, basename='api_news')
router.register(r'departments', views.DepartmentViewSet, basename='api_departments')
router.register(r'church-page-entries', views.ChurchPageEntryViewSet, basename='api_church_page_entries')
router.register(r'sermons', views.SermonViewSet, basename='api_sermons')

# CMS nested router
cms_router = DefaultRouter()
cms_router.register(r'settings', SiteSettingViewSet, basename='cms_settings')
cms_router.register(r'homepage', HomePageContentViewSet, basename='cms_homepage')
cms_router.register(r'social-links', SocialMediaLinkViewSet, basename='cms_social_links')
cms_router.register(r'contact-info', ContactInfoViewSet, basename='cms_contact_info')
cms_router.register(r'footer-links', FooterLinkViewSet, basename='cms_footer_links')

urlpatterns = [
    # Custom endpoints (must come BEFORE router paths to avoid conflicts)
    path('members/export/', views.MemberViewSet.as_view({'get': 'export_members'}), name='members_export'),
    path('offerings/summary/', views.OfferingSummaryView.as_view(), name='offering_summary'),
    # Tanzania payment endpoints (must come before router to avoid /offerings/ conflict)
    path('offerings/payments/config/', views.ChurchPaymentSettingsView.as_view(), name='payment_config'),
    path('offerings/payments/mobile-money/', views.MobileMoneyPaymentView.as_view(), name='payment_mobile_money'),
    path('offerings/payments/bank-details/', views.BankTransferDetailsView.as_view(), name='payment_bank_details'),
    path('offerings/payments/status/<int:offering_id>/', views.PaymentStatusView.as_view(), name='payment_status'),
    path('offerings/payments/callback/', views.PaymentCallbackView.as_view(), name='payment_callback'),
    path('churches/top/', views.ChurchTopView.as_view(), name='churches_top'),
    path('events/popup/', views.PopupNewsView.as_view(), name='popup_news'),
    path('news/latest/', views.LatestNewsView.as_view(), name='latest_news'),
    path('members/registrations/pending/', views.PendingRegistrationsView.as_view(), name='pending_registrations'),
    path('audit-logs/', views.AuditLogsView.as_view(), name='audit_logs'),
    path('finance/monthly-summary/', views.MonthlySummaryView.as_view(), name='monthly_summary'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),
    path('dashboard/member/', views.MemberDashboardView.as_view(), name='member_dashboard'),
    path('zones/', views.ZoneListView.as_view(), name='zones'),
    path('regions/', views.RegionListView.as_view(), name='regions'),
    path('districts/', views.DistrictListView.as_view(), name='districts'),
    path('locals/', views.LocalChurchListView.as_view(), name='locals'),
    path('hierarchy/', views.ChurchHierarchyView.as_view(), name='church_hierarchy'),
    path('stats/users/', views.UserRoleStatsView.as_view(), name='user_stats'),
    path('reports/export/<str:report_type>/', views.export_report_view, name='export_report'),
    path('reports/church-comparison/', views.ChurchComparisonView.as_view(), name='church_comparison'),
    path('reports/district-comparison/', views.DistrictComparisonView.as_view(), name='district_comparison'),
    path('reports/region-comparison/', views.RegionComparisonView.as_view(), name='region_comparison'),
    path('reports/regional-financial/', views.RegionalFinancialReportView.as_view(), name='regional_financial'),
    path('reports/zone-financial/', views.ZoneFinancialSummaryView.as_view(), name='zone_financial'),
    path('reports/zone-budget-allocation/', views.ZoneBudgetAllocationView.as_view(), name='zone_budget_allocation'),
    path('reports/zone-comparison/', views.ZoneComparisonView.as_view(), name='zone_comparison'),
    path('reports/national-financial/', views.NationalFinancialReportView.as_view(), name='national_financial'),
    path('reports/national-budget/', views.NationalBudgetAllocationView.as_view(), name='national_budget'),
    path('system/health/', views.SystemHealthView.as_view(), name='system_health'),
    path('system/export-backup/', views.SystemDataExportView.as_view(), name='system_export_backup'),
    path('transfers/stats/', views.TransferStatsView.as_view(), name='transfer_stats'),
    path('resource-requests/', views.ResourceRequestView.as_view(), name='resource_requests'),
    path('contact/', PublicContactMessageCreateView.as_view(), name='public_contact_message'),
    
    # Router includes (must come AFTER custom paths)
    path('', include(router.urls)),
    path('cms/', include(cms_router.urls)),
    path('token/', views.LoginTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/password-reset/request/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('auth/me/', views.GetCurrentUserView.as_view(), name='current_user'),
    path('auth/me/update/', views.UpdateCurrentUserView.as_view(), name='current_user_update'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('auth/register/', views.RegisterMemberView.as_view(), name='member_register'),
    path('auth/verify-email/', views.VerifyEmailView.as_view(), name='verify_email'),
    path('auth/resend-verification/', views.ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('finance/budget-allocation/', views.FinanceBudgetAllocationView.as_view(), name='finance_budget_allocation'),
    path('finance/reconciliation/', views.FinanceReconciliationView.as_view(), name='finance_reconciliation'),
]