import hashlib
import secrets

from django.utils import timezone
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from .models import AccessKey

AREAS = ('finance', 'organization', 'health', 'meditation', 'math')
SCOPES = [f'{area}:{action}' for area in AREAS for action in ('read', 'write')]


def issue_key(user, name, scopes):
    token = 'lg_' + secrets.token_urlsafe(32)
    key = AccessKey.objects.create(user=user, name=name, prefix=token[:12], digest=hashlib.sha256(token.encode()).hexdigest(), scopes=scopes)
    return key, token


class PersonalKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if len(header) != 2 or header[0].lower() != b'bearer' or not header[1].startswith(b'lg_'):
            return None
        key = AccessKey.objects.select_related('user').filter(digest=hashlib.sha256(header[1]).hexdigest(), revoked_at__isnull=True, user__is_active=True).first()
        if not key:
            raise AuthenticationFailed('La clave es inválida o fue revocada.')
        AccessKey.objects.filter(pk=key.pk).update(last_used_at=timezone.now())
        return key.user, key

    def authenticate_header(self, request):
        return 'Bearer'


def require_scope(request, scope):
    if isinstance(request.auth, AccessKey) and scope not in request.auth.scopes:
        raise PermissionDenied(f'La clave requiere el permiso {scope}.')
