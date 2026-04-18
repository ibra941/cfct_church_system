from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'departments', views.DepartmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('departments/<int:pk>/add-member/', views.AddDepartmentMemberView.as_view(), name='add-member'),
]