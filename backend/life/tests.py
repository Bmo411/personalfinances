import datetime

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from finance.management.commands.send_whatsapp_notifications import Command
from .models import NotificationLog, Student, WorkTask


User = get_user_model()


class LifeApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='life_user', password='pass12345')
        self.other_user = User.objects.create_user(username='other_life_user', password='pass12345')
        self.client.force_authenticate(user=self.user)

    def test_create_entities_and_month_summary(self):
        student_response = self.client.post('/api/life/students/', {
            'name': 'David',
            'subject': 'Matematicas',
            'goal': 'Preparar examen',
            'next_follow_up': timezone.localdate().isoformat(),
        }, format='json')
        self.assertEqual(student_response.status_code, 201)

        scheduled_at = timezone.now() + datetime.timedelta(hours=2)
        lesson_response = self.client.post('/api/life/lessons/', {
            'student': student_response.data['id'],
            'scheduled_at': scheduled_at.isoformat(),
            'topic': 'Algebra',
            'homework': 'Traer ejercicios',
        }, format='json')
        self.assertEqual(lesson_response.status_code, 201)

        task_response = self.client.post('/api/life/tasks/', {
            'title': 'Enviar reporte semanal',
            'area': 'WORK',
            'priority': 'HIGH',
            'due_at': scheduled_at.isoformat(),
        }, format='json')
        self.assertEqual(task_response.status_code, 201)

        focus_response = self.client.patch('/api/life/monthly-focus/current/', {
            'company_focus': 'Cerrar dos clientes',
            'skills_focus': 'Practicar ventas',
        }, format='json')
        self.assertEqual(focus_response.status_code, 200)

        summary_response = self.client.get('/api/life/month-summary/')
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.data['counts']['active_students'], 1)
        self.assertEqual(summary_response.data['counts']['scheduled_lessons'], 1)
        self.assertEqual(summary_response.data['counts']['open_tasks'], 1)
        self.assertEqual(summary_response.data['focus']['company_focus'], 'Cerrar dos clientes')

    def test_user_only_sees_own_life_data(self):
        Student.objects.create(user=self.user, name='Alumno propio')
        Student.objects.create(user=self.other_user, name='Alumno ajeno')
        WorkTask.objects.create(user=self.other_user, title='Tarea ajena')

        students_response = self.client.get('/api/life/students/')
        tasks_response = self.client.get('/api/life/tasks/')

        self.assertEqual(students_response.status_code, 200)
        self.assertEqual([student['name'] for student in students_response.data], ['Alumno propio'])
        self.assertEqual(tasks_response.status_code, 200)
        self.assertEqual(tasks_response.data, [])

    def test_complete_task_removes_it_from_open_summary(self):
        due_at = timezone.now() + datetime.timedelta(hours=1)
        task_response = self.client.post('/api/life/tasks/', {
            'title': 'Preparar clase',
            'area': 'CLASS',
            'due_at': due_at.isoformat(),
        }, format='json')
        self.assertEqual(task_response.status_code, 201)

        complete_response = self.client.post(f'/api/life/tasks/{task_response.data["id"]}/complete/')
        self.assertEqual(complete_response.status_code, 200)

        summary_response = self.client.get('/api/life/month-summary/')
        self.assertEqual(summary_response.data['counts']['open_tasks'], 0)

    def test_notification_log_prevents_duplicate_whatsapp_sends(self):
        command = Command()
        calls = []

        def fake_send(user, message, label, days_until):
            calls.append((user.username, message, label, days_until))
            return True

        command._send_callmebot = fake_send
        today = timezone.localdate()

        command._send_once(self.user, 'Mensaje', 'life reminder', 'life:test:1', today, 0)
        command._send_once(self.user, 'Mensaje', 'life reminder', 'life:test:1', today, 0)

        self.assertEqual(len(calls), 1)
        self.assertEqual(NotificationLog.objects.filter(user=self.user, event_key='life:test:1').count(), 1)
