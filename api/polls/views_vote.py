from typing import Dict
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.core.cache import cache
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .models import Poll, PollOption, Vote
from .utils import get_client_ip, sha256_hex
from .pubsub import publish_poll_update

RATE_LIMIT_IP_PER_MIN = 60      # максимум голосов в минуту с одного IP
RATE_LIMIT_DEV_PER_MIN = 60     # максимум голосов в минуту с одного устройства
COOKIE_DEVICE_KEY = 'did'       # cookie-ключ для device id
COOKIE_MAX_AGE = 60 * 60 * 24 * 365  # 1 год

class VoteView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # без сессий/JWT — нет CSRF-оверлея

    def _rate_limit(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        """Простой rate limit (скользящее окно по минутам) через Redis cache."""
        import time
        bucket = int(time.time() // window_seconds)
        cache_key = f"rl:{key}:{bucket}"
        # атомарное увеличение счётчика
        current = cache.get(cache_key)
        if current is None:
            # создаём со сроком жизни окна
            added = cache.add(cache_key, 1, timeout=window_seconds)
            if not added:
                # параллельная гонка: ключ уже есть
                try:
                    current = cache.incr(cache_key)
                except Exception:
                    return False
                return current <= limit
            return True
        else:
            try:
                current = cache.incr(cache_key)
            except Exception:
                return False
            return current <= limit

    def post(self, request):
        data = request.data or {}
        poll_id = data.get('poll_id')
        option_id = data.get('option_id')
        if not poll_id or not option_id:
            return Response({'detail': 'poll_id и option_id обязательны'}, status=status.HTTP_400_BAD_REQUEST)
        # загружаем сущности
        try:
            poll = Poll.objects.select_related('stats').get(pk=int(poll_id))
        except (Poll.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Опрос не найден'}, status=status.HTTP_404_NOT_FOUND)
        try:
            option = PollOption.objects.get(pk=int(option_id), poll=poll)
        except (PollOption.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Опция не найдена в данном опросе'}, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем активность
        now = timezone.now()
        if poll.is_hidden or poll.is_frozen or (poll.closes_at and now >= poll.closes_at):
            return Response({'detail': 'Опрос закрыт/недоступен'}, status=status.HTTP_403_FORBIDDEN)

        # Идентификаторы
        user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        ip = get_client_ip(request)
        ip_hash = sha256_hex(ip)

        device_id = request.headers.get('X-Device-Id') or request.COOKIES.get(COOKIE_DEVICE_KEY)
        set_cookie_device = False
        if not device_id:
            # создаём мягкий device id и отдадим его в cookie (поможет для повторного захода)
            import secrets
            device_id = secrets.token_urlsafe(16)
            set_cookie_device = True
        device_hash = sha256_hex(device_id)

        # Rate limits
        if not self._rate_limit(f"ip:{ip_hash}", RATE_LIMIT_IP_PER_MIN):
            return Response({'detail': 'Слишком много запросов с IP'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if device_hash and not self._rate_limit(f"dev:{device_hash}", RATE_LIMIT_DEV_PER_MIN):
            return Response({'detail': 'Слишком много запросов с устройства'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Идемпотентность
        idem = (request.headers.get('Idempotency-Key') or '')[:64]
        if idem:
            existing_by_idem = Vote.objects.filter(idempotency_key=idem, poll=poll).first()
            if existing_by_idem:
                # возвращаем актуальные агрегаты
                return self._response_with_stats(poll, option.id, already_voted=True, idempotent=True, set_cookie_device=set_cookie_device, device_id=device_id)

        # Уже голосовал? (по пользователю/устройству/IP)
        q = Vote.objects.filter(poll=poll)
        cond = Q()
        if user:
            cond |= Q(user=user)
        if device_hash:
            cond |= Q(device_hash=device_hash)
        if ip_hash:
            cond |= Q(ip_hash=ip_hash)
        existing = q.filter(cond).first() if cond.children else None
        if existing:
            # Один голос на опрос (MVP)
            return self._response_with_stats(poll, existing.option_id, already_voted=True, idempotent=False, set_cookie_device=set_cookie_device, device_id=device_id)

        # Создаём голос (обработка гонок/уникальных ограничений)
        try:
            with transaction.atomic():
                Vote.objects.create(
                    poll=poll,
                    option=option,
                    user=user,
                    ip_hash=ip_hash or None,
                    device_hash=device_hash or None,
                    idempotency_key=idem or None,
                )
        except IntegrityError:
            # уникальные ограничения сработали — считаем, что голос уже есть
            return self._response_with_stats(poll, option.id, already_voted=True, idempotent=bool(idem), set_cookie_device=set_cookie_device, device_id=device_id)

        # Успех
        return self._response_with_stats(poll, option.id, already_voted=False, idempotent=bool(idem), set_cookie_device=set_cookie_device, device_id=device_id)

    def _response_with_stats(self, poll: Poll, chosen_option_id: int, *, already_voted: bool, idempotent: bool, set_cookie_device: bool, device_id: str):
        # Считаем свежие агрегаты (MVP): можно ускорить, читая poll.stats при наличии
        agg = Vote.objects.filter(poll=poll).values('option_id').annotate(c=Count('id'))
        counts: Dict[int, int] = {row['option_id']: row['c'] for row in agg}
        total = sum(counts.values()) or 0
        percents = {opt_id: round((count / total) * 100, 2) if total else 0.0 for opt_id, count in counts.items()}
        payload = {
            'poll_id': poll.id,
            'voted_option_id': chosen_option_id,
            'already_voted': already_voted,
            'idempotent': idempotent,
            'total_votes': total,
            'counts': counts,
            'percents': percents,
        }
        if not already_voted:
            try:
                publish_poll_update(poll.id, payload)
            except Exception:
                # не ломаем ответ клиенту, если Redis недоступен
                pass
        resp = Response(payload, status=status.HTTP_200_OK)
        if set_cookie_device and device_id:
            # выставляем девайс‑ID, чтобы на фронте не городить генерацию
            resp.set_cookie(COOKIE_DEVICE_KEY, device_id, max_age=COOKIE_MAX_AGE, httponly=False, samesite='Lax')
        
        return resp