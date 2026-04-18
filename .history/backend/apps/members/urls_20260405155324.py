from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'registrations', views.MemberRegistrationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.MemberRegisterView.as_view(), name='member-register'),
]