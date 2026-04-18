from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'registrations', views.MemberRegistrationViewSet)

urlpatterns = [
    # Public registration endpoint (no authentication required)
    path('public/register/', views.member_register_public, name='public-register'),
    
    path('', include(router.urls)),
    path('register/', views.MemberRegisterView.as_view(), name='member-register'),
    
    # Approval endpoints
    path('registrations/duplicates/', views.DuplicateMembersView.as_view(), name='duplicate-members'),
    path('registrations/bulk-action/', views.BulkRegistrationActionView.as_view(), name='bulk-registration-action'),
    path('registrations/export/csv/', views.RegistrationExportCsvView.as_view(), name='registration-export-csv'),
    path('registrations/pending/', views.PendingRegistrationsView.as_view(), name='pending-registrations'),
    path('registrations/<int:pk>/approve/', views.ApproveRegistrationView.as_view(), name='approve-registration'),
    path('registrations/<int:pk>/reject/', views.RejectRegistrationView.as_view(), name='reject-registration'),
    path('registrations/<int:pk>/', views.RegistrationDetailView.as_view(), name='registration-detail'),
]