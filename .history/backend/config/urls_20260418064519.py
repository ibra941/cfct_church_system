from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from .admin import admin_site

FRONTEND_DIST_DIR = settings.BASE_DIR.parent / 'frontend' / 'dist'
FRONTEND_PUBLIC_DIR = settings.BASE_DIR.parent / 'frontend' / 'public'
FRONTEND_SRC_ASSETS_DIR = settings.BASE_DIR.parent / 'frontend' / 'src' / 'assets'

urlpatterns = [
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
    re_path(r'^(?!admin/|api/|media/|static/).*$' , serve, {'path': 'index.html', 'document_root': str(FRONTEND_DIST_DIR)}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)