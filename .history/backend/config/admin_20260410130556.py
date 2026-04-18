from django.contrib import admin
from django.urls import path, reverse
from django.utils.html import format_html
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomAdminSite(AdminSite):
    site_header = "CFCT Church System Administration"
    site_title = "CFCT Admin"
    index_title = "Church Management System"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('register-leader/', self.admin_view(self.register_leader_redirect), name='register_leader_redirect'),
        ]
        return custom_urls + urls

    def register_leader_redirect(self, request):
        # Redirect to the accounts user register leader view
        return self.admin_view(lambda r: None)(request)  # This will be handled by the accounts admin

    def each_context(self, request):
        context = super().each_context(request)
        if request.user.is_authenticated and (request.user.is_superuser or request.user.role == 'national_leader'):
            context['leader_registration_url'] = reverse('admin:register_leader')
        return context


# Create the custom admin site
admin_site = CustomAdminSite(name='admin')
admin.site = admin_site

# Import and register all admin classes
from apps.accounts.admin import CustomUserAdmin
from apps.churches.admin import ChurchAdmin
from apps.members.admin import MemberRegistrationAdmin
from apps.events.admin import EventAdmin
from apps.offerings.admin import OfferingAdmin
from apps.news.admin import NewsAdmin, NewsCategoryAdmin
from apps.departments.admin import DepartmentAdmin
from apps.finance.admin import FinancialTransactionAdmin
from apps.reports.admin import ReportAdmin
from apps.prayers.admin import PrayerRequestAdmin
from apps.transfers.admin import TransferAdmin
from apps.notifications.admin import NotificationAdmin
from apps.leadership.admin import LeadershipHistoryAdmin
from apps.cms.admin import (
    SiteSettingAdmin,
    HomePageContentAdmin,
    SocialMediaLinkAdmin,
    ContactInfoAdmin,
    FooterLinkAdmin,
)

# Import models
from apps.churches.models import Church
from apps.members.models import MemberRegistration
from apps.events.models import Event
from apps.offerings.models import Offering
from apps.news.models import News, NewsCategory
from apps.departments.models import Department
from apps.finance.models import FinancialTransaction
from apps.reports.models import Report
from apps.prayers.models import PrayerRequest
from apps.transfers.models import Transfer
from apps.notifications.models import Notification
from apps.leadership.models import LeadershipHistory
from apps.cms.models import SiteSetting, HomePageContent, SocialMediaLink, ContactInfo, FooterLink

# Register models
admin_site.register(User, CustomUserAdmin)
admin_site.register(Church, ChurchAdmin)
admin_site.register(MemberRegistration, MemberRegistrationAdmin)
admin_site.register(Event, EventAdmin)
admin_site.register(Offering, OfferingAdmin)
admin_site.register(News, NewsAdmin)
admin_site.register(NewsCategory, NewsCategoryAdmin)
admin_site.register(Department, DepartmentAdmin)
admin_site.register(FinancialTransaction, FinancialTransactionAdmin)
admin_site.register(Report, ReportAdmin)
admin_site.register(PrayerRequest, PrayerRequestAdmin)
admin_site.register(Transfer, TransferAdmin)
admin_site.register(Notification, NotificationAdmin)
admin_site.register(LeadershipHistory, LeadershipHistoryAdmin)
admin_site.register(SiteSetting, SiteSettingAdmin)
admin_site.register(HomePageContent, HomePageContentAdmin)
admin_site.register(SocialMediaLink, SocialMediaLinkAdmin)
admin_site.register(ContactInfo, ContactInfoAdmin)
admin_site.register(FooterLink, FooterLinkAdmin)