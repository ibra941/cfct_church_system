from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'churches', views.ChurchViewSet)
router.register(r'members', views.MemberViewSet)
router.register(r'events', views.EventViewSet)
router.register(r'offerings', views.OfferingViewSet)
router.register(r'prayers', views.PrayerViewSet)
router.register(r'transfers', views.TransferViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'news', views.NewsViewSet)
router.register(r'departments', views.DepartmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.GetCurrentUserView.as_view(), name='current_user'),
    path('events/popup/', views.PopupNewsView.as_view(), name='popup_news'),
    path('news/latest/', views.LatestNewsView.as_view(), name='latest_news'),
]