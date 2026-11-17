import csv
import io
from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from finance.models import Transaction
from finance.serializers import TransactionSerializer
from finance.views import TransactionViewSet
from life.hub import today_summary, math_panel, progress
from life.models import MathSnapshot
from life.quotes import daily_quote
from .auth import PersonalKeyAuthentication, SCOPES, require_scope, issue_key
from .models import AccessKey, ImportDraft
from .services import resource_info, save_record, mutate_once, digest_payload


class KeyInput(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    scopes = serializers.ListField(child=serializers.ChoiceField(choices=SCOPES), allow_empty=False)


class KeysView(APIView):
    def get(self, request):
        keys = AccessKey.objects.filter(user=request.user).order_by('-created_at').values('id', 'name', 'prefix', 'scopes', 'created_at', 'last_used_at', 'revoked_at')
        return Response({'keys': list(keys), 'scopes': SCOPES})

    def post(self, request):
        payload = KeyInput(data=request.data)
        payload.is_valid(raise_exception=True)
        key, token = issue_key(request.user, **payload.validated_data)
        return Response({'id': key.id, 'key': token, 'prefix': key.prefix}, status=201)


class RevokeKeyView(APIView):
    def post(self, request, pk):
        key = get_object_or_404(AccessKey, user=request.user, pk=pk)
        key.revoked_at = timezone.now()
        key.save(update_fields=['revoked_at'])
        return Response({'revoked': True})


class IntegrationView(APIView):
    authentication_classes = [PersonalKeyAuthentication, JWTAuthentication]


class SessionView(IntegrationView):
    def get(self, request):
        return Response({'scopes': getattr(request.auth, 'scopes', SCOPES)})


class RecordsView(IntegrationView):
    def options(self, request, resource, pk=None):
        from rest_framework.metadata import SimpleMetadata
        serializer_class, _ = resource_info(request, resource, 'read')
        fields = SimpleMetadata().get_serializer_info(serializer_class(context={'request': request}))
        return Response({'resource': resource, 'fields': fields, 'idempotency': 'UUID en Idempotency-Key para POST y PATCH'})

    def get(self, request, resource, pk=None):
        serializer_class, queryset = resource_info(request, resource, 'read')
        if pk:
            return Response(serializer_class(get_object_or_404(queryset, pk=pk)).data)
        try:
            offset = max(0, int(request.query_params.get('offset', 0)))
            limit = min(100, max(1, int(request.query_params.get('limit', 50))))
        except ValueError:
            raise ValidationError('limit y offset deben ser enteros.')
        if resource == 'workouts':
            queryset = queryset.prefetch_related('sets')
        return Response({'count': queryset.count(), 'results': serializer_class(queryset.order_by('-pk')[offset:offset + limit], many=True).data})

    def post(self, request, resource):
        resource_info(request, resource, 'write')
        result = mutate_once(request, {'resource': resource, 'data': request.data}, lambda: save_record(request, resource, request.data))
        return Response(result, status=201)

    def patch(self, request, resource, pk):
        resource_info(request, resource, 'write')
        result = mutate_once(request, {'resource': resource, 'id': pk, 'data': request.data}, lambda: save_record(request, resource, request.data, pk))
        return Response(result)


class SummaryView(IntegrationView):
    def get(self, request, area):
        require_scope(request, f'{area}:read')
        if area == 'finance':
            return TransactionViewSet(request=request).summary(request)
        if area == 'organization':
            summary = today_summary(request.user)
            return Response({key: summary[key] for key in ('date', 'today_tasks', 'overdue_tasks', 'unscheduled_tasks', 'followups')})
        if area == 'health':
            metrics = progress(request.user)
            for period in ('current', 'previous'):
                metrics[period].pop('meditation_minutes')
                metrics[period].pop('meditation_days')
            return Response(metrics)
        if area == 'meditation':
            return Response({'quote': daily_quote(timezone.localdate())})
        if area == 'math':
            return Response(math_panel(request.user))
        raise ValidationError('Área desconocida.')


class PreviewImportView(IntegrationView):
    def post(self, request):
        require_scope(request, 'finance:write')
        rows = request.data.get('rows')
        if rows is None and isinstance(request.data.get('csv'), str):
            rows = list(csv.DictReader(io.StringIO(request.data['csv'])))
            rows = [{k: v for k, v in row.items() if v != ''} for row in rows]
        if not isinstance(rows, list) or not 1 <= len(rows) <= 500:
            raise ValidationError('Envía de 1 a 500 movimientos en rows o CSV con encabezados de la API.')
        normalized, warnings = [], []
        totals = {'IN': Decimal('0'), 'OUT': Decimal('0')}
        fingerprints = set()
        for index, row in enumerate(rows):
            if not isinstance(row, dict) or any(key in row for key in ('is_deleted', 'is_transfer')):
                raise ValidationError({'row': index + 1, 'error': 'Formato de movimiento inválido.'})
            serializer = TransactionSerializer(data=row, context={'request': request})
            if not serializer.is_valid():
                raise ValidationError({'row': index + 1, 'errors': serializer.errors})
            values = serializer.validated_data
            fingerprint = (values['date'].isoformat(), str(values['amount']), values['type'], getattr(values.get('account'), 'id', None), values.get('description') or '')
            exists = Transaction.objects.filter(user=request.user, is_deleted=False, date=values['date'], amount=values['amount'], type=values['type'], account=values.get('account')).exists()
            if exists or fingerprint in fingerprints:
                warnings.append({'row': index + 1, 'message': 'Posible duplicado. Revisa fecha, importe y cuenta.'})
            fingerprints.add(fingerprint)
            totals[values['type']] += values['amount']
            normalized.append({key: value for key, value in serializer.data.items() if key not in ('id', 'user', 'is_deleted', 'is_transfer', 'created_at', 'updated_at', 'category_name', 'category_color')})
        draft = ImportDraft.objects.create(user=request.user, rows=normalized)
        return Response({'draft_id': draft.id, 'rows': normalized, 'warnings': warnings, 'income': str(totals['IN']), 'expense': str(totals['OUT']), 'net': str(totals['IN'] - totals['OUT'])})


class ConfirmImportView(IntegrationView):
    def post(self, request, pk):
        require_scope(request, 'finance:write')
        if request.data.get('confirmed') is not True:
            raise ValidationError('Confirma la vista previa con confirmed=true.')

        def commit():
            draft = get_object_or_404(ImportDraft.objects.select_for_update(), pk=pk, user=request.user)
            if draft.result is not None:
                return draft.result
            rows = [save_record(request, 'transactions', row) for row in draft.rows]
            result = {'draft_id': str(draft.id), 'ids': [row['id'] for row in rows], 'count': len(rows)}
            draft.result = result
            draft.save(update_fields=['result'])
            return result

        return Response(mutate_once(request, {'draft': str(pk), 'confirmed': True}, commit))


class MathStudentInput(serializers.Serializer):
    source_id = serializers.CharField(max_length=200)
    name = serializers.CharField(max_length=150)
    content = serializers.CharField(max_length=100000)


class MathPlanInput(serializers.Serializer):
    source_id = serializers.CharField(max_length=300)
    content = serializers.CharField(max_length=100000)


class MathInput(serializers.Serializer):
    panel = serializers.CharField(max_length=100000)
    students = MathStudentInput(many=True, allow_empty=False)
    plans = MathPlanInput(many=True)

    def validate_students(self, value):
        identities = [item['source_id'] for item in value]
        if len(set(identities)) != len(identities):
            raise serializers.ValidationError('Hay alumnos duplicados en la sincronización.')
        return value


class MathSyncView(IntegrationView):
    @transaction.atomic
    def post(self, request):
        require_scope(request, 'math:write')
        payload = MathInput(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        digest = digest_payload(data)

        def sync():
            snapshot, created = MathSnapshot.objects.get_or_create(user=request.user, source='matematicas', defaults={'digest': digest, 'payload': data})
            if not created and snapshot.digest != digest:
                snapshot.payload, snapshot.digest = data, digest
                snapshot.save()
            return {'digest': digest, 'updated_at': snapshot.updated_at, 'students': len(data['students'])}

        return Response(mutate_once(request, {'math': digest}, sync))
