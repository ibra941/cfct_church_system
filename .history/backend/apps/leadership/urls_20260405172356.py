from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'leadership', views.LeadershipHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('current/', views.CurrentLeadershipView.as_view(), name='current-leadership'),
]