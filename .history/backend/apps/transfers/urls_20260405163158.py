from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transfers', views.TransferViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('transfers/<int:pk>/approve/', views.ApproveTransferView.as_view(), name='approve-transfer'),
]