from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'prayers', views.PrayerRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('prayers/<int:pk>/pray/', views.PrayForRequestView.as_view(), name='pray-for-request'),
]