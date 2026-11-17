import hashlib
import json
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.renderers import JSONRenderer

from finance.serializers import TransactionSerializer, AccountSerializer, CategorySerializer
from finance.views import TransactionViewSet
from life.serializers import WorkTaskSerializer
from life.hub_serializers import ProjectSerializer, NoteSerializer, ProspectSerializer, WorkoutSerializer, MealSerializer, MeditationSerializer
from .auth import require_scope
from .models import MutationReceipt

RESOURCES = {
    'transactions': ('finance', TransactionSerializer),
    'accounts': ('finance', AccountSerializer),
    'categories': ('finance', CategorySerializer),
    'projects': ('organization', ProjectSerializer),
    'tasks': ('organization', WorkTaskSerializer),
    'notes': ('organization', NoteSerializer),
    'prospects': ('organization', ProspectSerializer),
    'workouts': ('health', WorkoutSerializer),
    'meals': ('health', MealSerializer),
    'meditations': ('meditation', MeditationSerializer),
}


def resource_info(request, resource, action):
    if resource not in RESOURCES:
        raise ValidationError('Tipo de registro desconocido.')
    area, serializer = RESOURCES[resource]
    require_scope(request, f'{area}:{action}')
    queryset = serializer.Meta.model.objects.filter(user=request.user)
    if resource == 'transactions':
        queryset = queryset.filter(is_deleted=False)
    return serializer, queryset


def save_record(request, resource, data, record_id=None):
    serializer_class, queryset = resource_info(request, resource, 'write')
    instance = get_object_or_404(queryset, pk=record_id) if record_id else None
    if resource == 'transactions' and any(field in data for field in ('is_deleted', 'is_transfer')):
        raise ValidationError('Usa esta operación para ingresos y egresos individuales.')
    serializer = serializer_class(instance, data=data, partial=bool(instance), context={'request': request})
    serializer.is_valid(raise_exception=True)
    if resource == 'transactions':
        view = TransactionViewSet(request=request)
        if instance:
            view.perform_update(serializer)
        else:
            view.perform_create(serializer)
    else:
        serializer.save(user=request.user)
    return serializer.data


def digest_payload(payload):
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


@transaction.atomic
def mutate_once(request, payload, operation):
    try:
        request_id = uuid.UUID(request.headers.get('Idempotency-Key', ''))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError('Envía un UUID en Idempotency-Key para poder reintentar con seguridad.')
    # Serialize writes per account, including concurrent requests with the same key.
    get_user_model().objects.select_for_update().get(pk=request.user.pk)
    digest = digest_payload(payload)
    receipt = MutationReceipt.objects.filter(user=request.user, request_id=request_id).first()
    if receipt:
        if receipt.digest != digest:
            raise ValidationError('Esta clave de solicitud ya se usó con otros datos.')
        return receipt.result
    result = json.loads(JSONRenderer().render(operation()))
    MutationReceipt.objects.create(user=request.user, request_id=request_id, digest=digest, result=result)
    return result
