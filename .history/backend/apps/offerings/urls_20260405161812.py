from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'offerings', views.OfferingViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', views.OfferingSummaryView.as_view(), name='offering-summary'),
]