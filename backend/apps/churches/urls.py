from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'churches', views.ChurchViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('hierarchy/', views.ChurchHierarchyView.as_view(), name='church-hierarchy'),
]