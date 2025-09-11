from pathlib import Path
import os
import environ
from datetime import timedelta

# --- Base paths & env ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    CORS_ALLOW_ALL=(bool, False),
)
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost")
# You can also pass multiple origins via env var, comma-separated
CORS_ALLOWED_ORIGINS_ENV = os.environ.get("CORS_ALLOWED_ORIGINS", "")

environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY', default='dev-secret-key')
DEBUG = env.bool('DJANGO_DEBUG', default=False)

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "api", "nginx"]

# --- Celery / Redis -----------------------------------------------------------
CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
CELERY_TASK_ALWAYS_EAGER = False
CELERY_BEAT_SCHEDULE = {
    'aggregate-events-5min': {
        'task': 'polls.tasks.aggregate_events',
        'schedule': 300.0,
    },
}

# --- Logging ------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "django.server": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "polls": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "polls.stream": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "uvicorn.error": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "gunicorn.error": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
        "gunicorn.access": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# --- Apps ---------------------------------------------------------------------
INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # refresh blacklist on logout/rotation
    'corsheaders',  # CORS support

    # Local
    'polls',
]

# --- Auth backends ------------------------------------------------------------
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# --- Middleware ---------------------------------------------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# --- URLs / WSGI / ASGI -------------------------------------------------------
ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# --- Database / Cache ---------------------------------------------------------
DATABASES = {
    'default': env.db('DATABASE_URL', default="postgresql://polls:changeme@localhost:5432/polls")
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/0'),
    }
}

# --- DRF ----------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,

    # Order matters: cookie auth first, then header-based JWT, then session
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'polls.auth_cookie.CookieJWTAuthentication',                  # our cookie-based JWT auth
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # fallback via Authorization header
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

# --- Simple JWT ---------------------------------------------------------------
SIMPLE_JWT = {
    # Short-lived access token for better security
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),

    # Enable refresh rotation and blacklist of old refresh tokens
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,

    'AUTH_HEADER_TYPES': ('Bearer',),
    # You can also set ALGORITHM, SIGNING_KEY, etc. if needed
}

# --- JWT cookies (used by CookieJWTAuthentication) ----------------------------
# NOTE: In production, use HTTPS + Secure cookies. For cross-site frontends, set SameSite=None.
JWT_ACCESS_COOKIE = 'access_token'
JWT_REFRESH_COOKIE = 'refresh_token'
JWT_COOKIE_SECURE = False        # PROD: True (HTTPS required)
JWT_COOKIE_SAMESITE = 'Lax'      # PROD cross-domain: 'None' (requires Secure=True)
JWT_COOKIE_PATH = '/'

# --- Password validation ------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- I18N / TZ ----------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Static -------------------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Email (dev -> console) ---------------------------------------------------
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'no-reply@polls.local'

# --- CORS / CSRF --------------------------------------------------------------
# Build CORS_ALLOWED_ORIGINS from env; fallback to FRONTEND_ORIGIN single value
_cors_list = [o.strip() for o in CORS_ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
if not _cors_list and FRONTEND_ORIGIN:
    _cors_list = [FRONTEND_ORIGIN]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost",
    "http://127.0.0.1",
]
# CORS_ALLOWED_ORIGINS = 
# _cors_list
# Optional: allow all in local dev if you prefer (overrides allowed origins)
# CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL', default=False)

# CSRF trusted origins should include your frontend(s)
# Example: http://localhost:3000 or https://app.example.com
CSRF_TRUSTED_ORIGINS = [
    *(o if "://" in o else f"http://{o}" for o in _cors_list),
]

# If you serve API under a subpath/domain and need custom cookie behavior, you can also tune:
# SESSION_COOKIE_SAMESITE = 'Lax'   # PROD cross-domain: 'None' + SESSION_COOKIE_SECURE=True
# SESSION_COOKIE_SECURE = False     # PROD: True
