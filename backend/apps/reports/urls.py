from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'reports', views.ReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('generate/', views.GenerateReportView.as_view(), name='generate-report'),
    path('export/<str:report_type>/', views.ExportReportView.as_view(), name='export-report'),
]