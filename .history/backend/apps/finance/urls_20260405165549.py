from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transactions', views.FinancialTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', views.FinancialSummaryView.as_view(), name='financial-summary'),
    path('monthly-summary/', views.MonthlySummaryView.as_view(), name='monthly-summary'),
]