from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic import RedirectView
from .admin import admin_site

try:
    from rest_framework import permissions
    from drf_yasg import openapi
    from drf_yasg.views import get_schema_view

    SWAGGER_AVAILABLE = True
except ImportError:
    SWAGGER_AVAILABLE = False

FRONTEND_DIST_DIR = settings.BASE_DIR.parent / 'frontend' / 'dist'
FRONTEND_PUBLIC_DIR = settings.BASE_DIR.parent / 'frontend' / 'public'
FRONTEND_SRC_ASSETS_DIR = settings.BASE_DIR.parent / 'frontend' / 'src' / 'assets'

if SWAGGER_AVAILABLE:
    schema_view = get_schema_view(
        openapi.Info(
            title='CFCT API',
            default_version='v1',
            description='CFCT Church Management System API documentation',
        ),
        public=True,
        permission_classes=[permissions.AllowAny],
    )

urlpatterns = [
    path('admin', RedirectView.as_view(url='/admin/', permanent=False)),
    path('admin/', admin_site.urls),
    # API routes
    path('api/', include('apps.api.urls')),           # Main API routes (users, churches, etc.)
    path('api/members/', include('apps.members.urls')),  # ADD THIS - Member registration routes
    path('api/cms/', include('apps.cms.urls')),       # CMS routes

    # Frontend routes (served from built Vite output)
    path('', serve, {'path': 'index.html', 'document_root': str(FRONTEND_DIST_DIR)}, name='site-home'),
    path('assets/images/<path:path>', serve, {'document_root': str(FRONTEND_SRC_ASSETS_DIR / 'images')}),
    path('assets/<path:path>', serve, {'document_root': str(FRONTEND_DIST_DIR / 'assets')}),
    path('icons/<path:path>', serve, {'document_root': str(FRONTEND_PUBLIC_DIR / 'icons')}),
    path('manifest.json', serve, {'path': 'manifest.json', 'document_root': str(FRONTEND_DIST_DIR)}),
    path('manifest.webmanifest', serve, {'path': 'manifest.webmanifest', 'document_root': str(FRONTEND_DIST_DIR)}),
    path('robots.txt', serve, {'path': 'robots.txt', 'document_root': str(FRONTEND_DIST_DIR)}),
    path('registerSW.js', serve, {'path': 'registerSW.js', 'document_root': str(FRONTEND_DIST_DIR)}),
    path('sw.js', serve, {'path': 'sw.js', 'document_root': str(FRONTEND_DIST_DIR)}),
    re_path(r'^(?P<path>workbox-.*\.js)$', serve, {'document_root': str(FRONTEND_DIST_DIR)}),
    # SPA client-side routes fallback
    re_path(r'^(?!(admin(?:/|$)|api(?:/|$)|media(?:/|$)|static(?:/|$))).*$', serve, {'path': 'index.html', 'document_root': str(FRONTEND_DIST_DIR)}),
]

if SWAGGER_AVAILABLE:
    urlpatterns += [
        path('api/docs/openapi.json', schema_view.without_ui(cache_timeout=0), name='openapi-json'),
        path('api/docs/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='openapi-swagger-ui'),
        path('api/docs/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='openapi-redoc'),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)