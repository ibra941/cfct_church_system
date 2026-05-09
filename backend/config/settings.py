import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

_DEFAULT_SECRET_KEY = 'django-insecure-default-key'
SECRET_KEY = os.getenv('SECRET_KEY', _DEFAULT_SECRET_KEY)

DEBUG = os.getenv('DEBUG', 'True') == 'True'

if not DEBUG and (not SECRET_KEY or SECRET_KEY == _DEFAULT_SECRET_KEY):
    raise RuntimeError('SECRET_KEY must be set to a strong non-default value when DEBUG=False.')

_render_hostname = os.getenv('RENDER_EXTERNAL_HOSTNAME', '').strip()
_render_url = os.getenv('RENDER_EXTERNAL_URL', '').strip()
_default_allowed_hosts = ['localhost', '127.0.0.1']
if _render_hostname:
    _default_allowed_hosts.append(_render_hostname)

ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', ','.join(_default_allowed_hosts)).split(',') if h.strip()]

_default_csrf_trusted_origins = []
if _render_url:
    _default_csrf_trusted_origins.append(_render_url.rstrip('/'))
elif _render_hostname:
    _default_csrf_trusted_origins.append(f'https://{_render_hostname}')

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', ','.join(_default_csrf_trusted_origins)).split(',')
    if origin.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'apps.accounts',
    'apps.api',
    'apps.cms',
    'apps.churches',
    'apps.members',
    'apps.departments',
    'apps.events',
    'apps.offerings',
    'apps.attendance',
    'apps.leadership',
    'apps.finance',
    'apps.reports',
    'apps.news',
    'apps.prayers',
    'apps.transfers',
    'apps.notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'cfct_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Keep CI tests deterministic by allowing a lightweight SQLite test database.
if os.getenv('USE_SQLITE_FOR_TESTS', 'False') == 'True':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'sw'
TIME_ZONE = 'Africa/Dar_es_Salaam'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'static'
STATICFILES_DIRS = [BASE_DIR / 'staticfiles']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.AnonRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'user': os.getenv('THROTTLE_RATE_USER', '240/minute'),
        'anon': os.getenv('THROTTLE_RATE_ANON', '60/minute'),
        'login': os.getenv('THROTTLE_RATE_LOGIN', '10/minute'),
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'config.utils.api_errors.standardized_exception_handler',
}

CORS_ALLOW_ALL_ORIGINS = DEBUG and os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False') == 'True'
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
    ).split(',')
    if origin.strip()
]

# Basic lockout policy for failed login attempts
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv('MAX_FAILED_LOGIN_ATTEMPTS', '5'))
LOGIN_FAILURE_WINDOW_SECONDS = int(os.getenv('LOGIN_FAILURE_WINDOW_SECONDS', '900'))
LOGIN_LOCKOUT_SECONDS = int(os.getenv('LOGIN_LOCKOUT_SECONDS', '900'))

# Security hardening defaults (stricter in production)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'same-origin'

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG:
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True') == 'True'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# ============================================
# JWT Token Settings
# ============================================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JSON_ENCODER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'debug.log',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'DEBUG',
    },
}

# Email configuration — auto-selects SMTP when EMAIL_HOST is set, otherwise console
_email_host = os.getenv('EMAIL_HOST', '')
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend' if _email_host else 'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = _email_host
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False') == 'True'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'no-reply@cfct.local')
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')

# ============================================================
# Tanzania Payment Gateway — Azampay
# Docs: https://developerdocs.azampay.co.tz/
# Get credentials from: https://azampay.co.tz
# ============================================================
AZAMPAY_APP_NAME = os.getenv('AZAMPAY_APP_NAME', '')
AZAMPAY_CLIENT_ID = os.getenv('AZAMPAY_CLIENT_ID', '')
AZAMPAY_CLIENT_SECRET = os.getenv('AZAMPAY_CLIENT_SECRET', '')
PAYMENT_WEBHOOK_SIGNATURE_SECRET = os.getenv('PAYMENT_WEBHOOK_SIGNATURE_SECRET', '')
PAYMENT_WEBHOOK_SIGNATURE_HEADER = os.getenv('PAYMENT_WEBHOOK_SIGNATURE_HEADER', 'X-Azampay-Signature')
PAYMENT_WEBHOOK_REQUIRE_SIGNATURE = os.getenv('PAYMENT_WEBHOOK_REQUIRE_SIGNATURE', 'False') == 'True'

# ============================================================
# Church Bank Account Details (used for bank transfer payments)
# Set these to your church's actual bank account information.
# Supported Tanzania banks: CRDB, NMB, NBC, Equity, Stanchart
# ============================================================
CHURCH_BANK_NAME = os.getenv('CHURCH_BANK_NAME', 'CRDB Bank')
CHURCH_BANK_ACCOUNT_NUMBER = os.getenv('CHURCH_BANK_ACCOUNT_NUMBER', '')
CHURCH_BANK_ACCOUNT_NAME = os.getenv('CHURCH_BANK_ACCOUNT_NAME', 'CFCT Church')
CHURCH_BANK_BRANCH = os.getenv('CHURCH_BANK_BRANCH', '')
CHURCH_BANK_SWIFT_CODE = os.getenv('CHURCH_BANK_SWIFT_CODE', '')

# ============================================================
# Celery Configuration
# Set CELERY_BROKER_URL (e.g. redis://localhost:6379/0) to enable async tasks.
# ============================================================
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'

# ============================================================
# Audit log retention policy (days)
# ============================================================
AUDIT_LOG_RETENTION_DAYS = int(os.getenv('AUDIT_LOG_RETENTION_DAYS', '365'))

CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-tokens-daily': {
        'task': 'apps.api.tasks.cleanup_expired_tokens',
        'schedule': 86400,  # every 24 hours
    },
    'cleanup-audit-logs-daily': {
        'task': 'apps.api.tasks.cleanup_audit_logs',
        'schedule': 86400,  # every 24 hours
    },
}

# ============================================================
# Email verification token expiry (seconds)
# ============================================================
EMAIL_VERIFICATION_TIMEOUT = int(os.getenv('EMAIL_VERIFICATION_TIMEOUT', str(60 * 60 * 24)))  # 24 h
