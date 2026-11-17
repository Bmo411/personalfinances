import datetime
import uuid
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.contrib.auth import get_user_model
from django.test import skipUnlessDBFeature
from django.db import close_old_connections
from django.utils import timezone
from rest_framework.test import APITestCase, APITransactionTestCase, APIClient

from finance.models import Account, Category, Transaction
from life.models import MathSnapshot, NotificationLog, Project, Meal
from life.notifications import send_meditation_reminder
from .auth import issue_key, SCOPES


class IntegrationTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='owner', password='test-password')
        self.other = get_user_model().objects.create_user(username='other', password='test-password')
        self.key, self.token = issue_key(self.user, 'Tests', SCOPES)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.account = Account.objects.create(user=self.user, name='Tarjeta', type='CREDIT', statement_cut_day=15, payment_due_day=5)
        self.category = Category.objects.create(user=self.user, name='Comida', type='OUT')
        self.row = {'type': 'OUT', 'amount': '125.50', 'date': '2026-11-16', 'payment_method': 'CARD', 'account': self.account.pk, 'category': self.category.pk, 'description': 'Comida'}

    def post_record(self, resource, payload, nonce=None):
        return self.client.post(f'/api/integrations/records/{resource}/', payload, format='json', HTTP_IDEMPOTENCY_KEY=nonce or str(uuid.uuid4()))

    def test_revocation_and_scopes_enforced(self):
        self.key.scopes = ['finance:read']
        self.key.save()
        self.assertEqual(self.post_record('transactions', self.row).status_code, 403)
        self.assertEqual(self.client.get('/api/integrations/records/transactions/').status_code, 200)
        self.assertEqual(self.client.get('/api/integrations/summary/math/').status_code, 403)
        self.key.revoked_at = timezone.now()
        self.key.save()
        self.assertEqual(self.client.get('/api/integrations/records/transactions/').status_code, 401)

    def test_keys_cannot_manage_keys_or_use_unscoped_web_api(self):
        self.assertEqual(self.client.get('/api/integrations/keys/').status_code, 401)
        self.assertEqual(self.client.get('/api/life/today/').status_code, 401)

    def test_foreign_references_rejected_on_web_and_integration(self):
        foreign = Account.objects.create(user=self.other, name='Ajena', type='CASH')
        row = {**self.row, 'account': foreign.pk}
        self.assertEqual(self.post_record('transactions', row).status_code, 400)
        project = Project.objects.create(user=self.other, name='Ajeno')
        self.assertEqual(self.post_record('tasks', {'title': 'Tarea', 'project': project.pk}).status_code, 400)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/finance/transactions/', row, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/life/notes/', {'title': 'Nota', 'body': 'Contenido', 'project': project.pk}, format='json').status_code, 400)

    def test_single_write_replay_and_credit_dates_match_web(self):
        nonce = str(uuid.uuid4())
        first = self.post_record('transactions', self.row, nonce)
        self.assertEqual(first.status_code, 201, first.data)
        second = self.post_record('transactions', self.row, nonce)
        self.assertEqual(first.data, second.data)
        self.assertEqual(Transaction.objects.count(), 1)
        self.assertEqual(self.post_record('transactions', {**self.row, 'amount': '1.00'}, nonce).status_code, 400)
        self.client.force_authenticate(self.user)
        web = self.client.post('/api/finance/transactions/', self.row, format='json')
        self.assertEqual(web.status_code, 201)
        self.assertEqual(first.data['credit_statement_date'], web.data['credit_statement_date'])
        self.assertEqual(first.data['credit_due_date'], web.data['credit_due_date'])

    def test_financial_preview_commit_replay_and_duplicates(self):
        draft = self.client.post('/api/integrations/imports/preview/', {'rows': [self.row, self.row]}, format='json')
        self.assertEqual(draft.status_code, 200, draft.data)
        self.assertEqual(draft.data['expense'], '251.00')
        self.assertEqual(len(draft.data['warnings']), 1)
        self.assertEqual(Transaction.objects.count(), 0)
        path = f"/api/integrations/imports/{draft.data['draft_id']}/confirm/"
        self.assertEqual(self.client.post(path, {}, format='json').status_code, 400)
        first = self.client.post(path, {'confirmed': True}, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(first.status_code, 200, first.data)
        second = self.client.post(path, {'confirmed': True}, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(first.data['ids'], second.data['ids'])
        self.assertEqual(Transaction.objects.count(), 2)

    def test_import_revalidates_and_rolls_back_every_row(self):
        category2 = Category.objects.create(user=self.user, name='Temporal', type='OUT')
        draft = self.client.post('/api/integrations/imports/preview/', {'rows': [self.row, {**self.row, 'category': category2.pk}]}, format='json')
        category2.delete()
        result = self.client.post(f"/api/integrations/imports/{draft.data['draft_id']}/confirm/", {'confirmed': True}, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(result.status_code, 400)
        self.assertEqual(Transaction.objects.count(), 0)

    def test_math_sync_is_idempotent_and_failed_sync_preserves_snapshot(self):
        payload = {'panel': '# Panel', 'students': [{'source_id': 'alumna/seguimiento.md', 'name': 'Alumna', 'content': '## Tareas\nPreparada, sin fecha asignada'}], 'plans': []}
        for _ in range(2):
            result = self.client.post('/api/integrations/math/sync/', payload, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
            self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(MathSnapshot.objects.count(), 1)
        before = MathSnapshot.objects.get().updated_at
        response = self.client.post('/api/integrations/math/sync/', {**payload, 'students': []}, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(MathSnapshot.objects.get().updated_at, before)
        self.assertEqual(MathSnapshot.objects.get().payload, payload)

    def test_hub_reflects_tasks_workouts_meals_meditations(self):
        today = timezone.localdate().isoformat()
        task = self.post_record('tasks', {'title': 'Pendiente', 'due_at': timezone.now().isoformat()})
        workout = self.post_record('workouts', {'date': today, 'title': 'Pierna', 'sets': [{'exercise': 'Sentadilla', 'reps': 10, 'weight_kg': '20'}]})
        self.assertEqual(workout.status_code, 201, workout.data)
        self.assertEqual(self.post_record('meals', {'date': today, 'name': 'Comida', 'portion': 'Un plato', 'protein_g': '20'}).status_code, 201)
        self.assertEqual(self.post_record('meditations', {'date': today, 'minutes': 5}).status_code, 201)
        complete = self.client.patch(f"/api/integrations/records/tasks/{task.data['id']}/", {'status': 'DONE'}, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertTrue(complete.data['completed_at'])
        self.client.force_authenticate(self.user)
        home = self.client.get('/api/life/today/').data
        self.assertEqual(home['today_tasks'], [])
        metrics = home['progress']['current']
        self.assertEqual(metrics['sessions'], 1)
        self.assertEqual(metrics['sets'], 1)
        self.assertEqual(metrics['volume_kg'], 200)
        self.assertEqual(metrics['nutrition']['calories']['missing'], 1)
        self.assertEqual(metrics['meditation_minutes'], 5)

    def test_workout_update_is_atomic_and_foreign_record_inaccessible(self):
        record = self.post_record('workouts', {'date': '2026-11-16', 'title': 'Gym', 'sets': [{'exercise': 'Press', 'reps': 8, 'weight_kg': '10'}]})
        path = f"/api/integrations/records/workouts/{record.data['id']}/"
        invalid = self.client.patch(path, {'sets': [{'exercise': 'Press', 'reps': 0, 'weight_kg': '10'}]}, format='json', HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(self.client.get(path).data['sets'][0]['reps'], 8)
        _, other_token = issue_key(self.other, 'Other', SCOPES)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {other_token}')
        self.assertEqual(self.client.get(path).status_code, 404)

    @patch('life.notifications.send_whatsapp', return_value=('ACCEPTED', ''))
    def test_meditation_local_time_and_restart_do_not_duplicate(self, send):
        self.user.whatsapp_enabled = True
        local = timezone.make_aware(datetime.datetime(2026, 11, 16, 7, 0))
        send_meditation_reminder(self.user, local - datetime.timedelta(minutes=1))
        self.assertEqual(send.call_count, 0)
        send_meditation_reminder(self.user, local)
        send_meditation_reminder(self.user, local + datetime.timedelta(minutes=1))
        self.assertEqual(send.call_count, 1)
        self.assertEqual(NotificationLog.objects.get().status, 'ACCEPTED')

    @patch('users.whatsapp.requests.get')
    def test_rejected_whatsapp_key_is_visible_without_disclosing_secret(self, get):
        get.return_value.status_code = 200
        get.return_value.text = 'ERROR: Invalid apikey'
        self.user.whatsapp_phone = '+520000000000'
        self.user.whatsapp_apikey = 'test-secret'
        self.user.save()
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/users/whatsapp-test/')
        self.assertEqual(response.status_code, 502)
        profile = self.client.get('/api/users/profile/').data
        self.assertEqual(profile['whatsapp_status'], 'CONFIG_REQUIRED')
        self.assertNotIn('whatsapp_apikey', profile)

    def test_schema_reports_nested_workout_fields(self):
        response = self.client.options('/api/integrations/records/workouts/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('sets', response.data['fields'])


class ConcurrentMutationTests(APITransactionTestCase):
    @skipUnlessDBFeature('has_select_for_update')
    def test_concurrent_retries_return_one_transaction(self):
        user = get_user_model().objects.create_user(username='parallel-owner')
        _, token = issue_key(user, 'Concurrency', SCOPES)
        account = Account.objects.create(user=user, name='Efectivo', type='CASH')
        category = Category.objects.create(user=user, name='Trabajo', type='IN')
        nonce = str(uuid.uuid4())
        barrier = Barrier(2)
        row = {'type': 'IN', 'amount': '250.00', 'date': '2026-11-17', 'account': account.pk, 'category': category.pk, 'payment_method': 'CASH'}

        def write():
            close_old_connections()
            try:
                client = APIClient()
                client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
                barrier.wait(timeout=10)
                response = client.post('/api/integrations/records/transactions/', row, format='json', HTTP_IDEMPOTENCY_KEY=nonce)
                return response.status_code, response.data
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: write(), range(2)))
        self.assertEqual(results[0][0], 201, results)
        self.assertEqual(results[0], results[1])
        self.assertEqual(Transaction.objects.filter(user=user).count(), 1)
