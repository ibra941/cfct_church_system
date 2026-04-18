from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'news', views.NewsViewSet)
router.register(r'categories', views.NewsCategoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]