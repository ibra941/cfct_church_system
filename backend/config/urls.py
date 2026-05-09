from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic import RedirectView
from django.http import JsonResponse, HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONOpenAPIRenderer
from rest_framework.schemas import get_schema_view

from .admin import admin_site

SWAGGER_AVAILABLE = True

schema_view = get_schema_view(
    title='CFCT API',
    description='CFCT Church Management System API documentation',
    version='v1',
    public=True,
    permission_classes=[AllowAny],
    renderer_classes=[JSONOpenAPIRenderer],
)

FRONTEND_DIST_DIR = settings.BASE_DIR.parent / 'frontend' / 'dist'
FRONTEND_PUBLIC_DIR = settings.BASE_DIR.parent / 'frontend' / 'public'
FRONTEND_SRC_ASSETS_DIR = settings.BASE_DIR.parent / 'frontend' / 'src' / 'assets'


def api_root(_request):
    return JsonResponse(
        {
            'service': 'cfct-backend',
            'status': 'ok',
            'health': '/api/health/live/',
            'docs': '/api/docs/openapi.json',
        }
    )


def empty_favicon(_request):
    return HttpResponse(status=204)

urlpatterns = [
    path('admin', RedirectView.as_view(url='/admin/', permanent=False)),
    path('admin/', admin_site.urls),

    # API routes
    path('api/', include('apps.api.urls')),
    path('api/members/', include('apps.members.urls')),
    path('api/cms/', include('apps.cms.urls')),

    # OpenAPI schema endpoint
    path('api/docs/openapi.json', schema_view, name='openapi-json'),

    # API service root and favicon for platform probes/browser requests
    path('', api_root, name='api-root'),
    path('favicon.ico', empty_favicon, name='favicon'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
