from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from .admin import admin_site

urlpatterns = [
    path('', TemplateView.as_view(template_name='site/home.html'), name='site-home'),
    path('admin/', admin_site.urls),
    # API routes
    path('api/', include('apps.api.urls')),           # Main API routes (users, churches, etc.)
    path('api/members/', include('apps.members.urls')),  # ADD THIS - Member registration routes
    path('api/cms/', include('apps.cms.urls')),       # CMS routes
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)