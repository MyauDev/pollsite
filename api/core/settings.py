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
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
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
    "formatters": {"verbose": {"format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "verbose"}},
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
    'polls',
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # Third-party
    'rest_framework',
    'rest_framework.authtoken',                 # dj-rest-auth не будет ругаться
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Auth (social/JWT)
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',


]
SITE_ID = 1

# --- dj-rest-auth -------------------------------------------------------------
DJ_REST_AUTH = {
    "TOKEN_MODEL": None,  # мы используем JWT, а не DRF Token
}

# --- Custom user --------------------------------------------------------------
AUTH_USER_MODEL = 'polls.User'  # <-- наш кастомный пользователь

# --- Auth backends ------------------------------------------------------------
AUTHENTICATION_BACKENDS = [
    'polls.auth_backends.EmailOrUsernameModelBackend',  # вход по email ИЛИ username
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# --- Middleware ---------------------------------------------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'allauth.account.middleware.AccountMiddleware',  # требуется allauth
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
                'django.template.context_processors.request',  # allauth требует это
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
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'polls.auth_cookie.CookieJWTAuthentication',                  # наши куки-JWT
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # fallback по заголовку
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    # чтобы грузить аватарки/формы из Next.js:
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ),
}

# --- Simple JWT ---------------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# --- JWT cookies --------------------------------------------------------------
JWT_ACCESS_COOKIE = 'access_token'
JWT_REFRESH_COOKIE = 'refresh_token'
JWT_COOKIE_SECURE = False        # PROD: True (HTTPS)
JWT_COOKIE_SAMESITE = 'Lax'      # PROD cross-domain: 'None' (+ Secure=True)
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

# --- Static / Media -----------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# для аватарок и других файлов
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Email (dev -> console) ---------------------------------------------------
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'no-reply@polls.local'
# Для Gmail в dev/prod можно переопределить в .env:
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp.gmail.com"
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = os.environ.get("SMTP_USER")
# EMAIL_HOST_PASSWORD = os.environ.get("SMTP_PASS")
# DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# --- CORS / CSRF --------------------------------------------------------------
_cors_list = [o.strip() for o in CORS_ALLOWED_ORIGINS_ENV.split(",") if o.strip()]
if not _cors_list and FRONTEND_ORIGIN:
    _cors_list = [FRONTEND_ORIGIN]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = _cors_list
CSRF_TRUSTED_ORIGINS = [
    *(o if "://" in o else f"http://{o}" for o in _cors_list),
]

# --- Allauth / dj-rest-auth ---------------------------------------------------
# Требуем И username, И email при регистрации; логин возможен по любому из них
ACCOUNT_AUTHENTICATION_METHOD = "username_email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = "optional"

# совместимость с примерами dj-rest-auth
REST_USE_JWT = True

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["openid", "email", "profile"],
        "AUTH_PARAMS": {"prompt": "select_account"},
    },
}
# --- Other settings -----------------------------------------------------------