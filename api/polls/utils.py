import hashlib
from django.conf import settings

def get_client_ip(request) -> str:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        # первый IP в XFF — клиентский
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')

def sha256_hex(value: str) -> str:
    if not value:
        return ''
    pepper = (settings.SECRET_KEY or '')[:16]
    h = hashlib.sha256()
    h.update((pepper + value).encode('utf-8'))
    return h.hexdigest()