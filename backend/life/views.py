from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Lesson, MonthlyFocus, Student, WorkTask
from .serializers import LessonSerializer, MonthlyFocusSerializer, StudentSerializer, WorkTaskSerializer
from .services import build_month_summary


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Student.objects
            .filter(user=self.request.user)
            .annotate(upcoming_lessons_count=Count('lessons', filter=Q(lessons__status='SCHEDULED')))
            .order_by('name')
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        student = self.get_object()
        note = (request.data.get('note') or '').strip()
        next_follow_up = request.data.get('next_follow_up')

        if note:
            timestamp = timezone.localtime().strftime('%Y-%m-%d %H:%M')
            separator = '\n\n' if student.notes else ''
            student.notes = f'{student.notes}{separator}[{timestamp}] {note}'
        if next_follow_up is not None:
            student.next_follow_up = next_follow_up or None
        student.last_contact_date = timezone.localdate()
        student.save()
        return Response(StudentSerializer(student, context={'request': request}).data)


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Lesson.objects.filter(user=self.request.user).select_related('student')
        status_filter = self.request.query_params.get('status')
        student_id = self.request.query_params.get('student')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset.order_by('scheduled_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        lesson = self.get_object()
        lesson.status = 'COMPLETED'
        lesson.completed_at = timezone.now()
        lesson.follow_up_notes = request.data.get('follow_up_notes', lesson.follow_up_notes)
        lesson.save()

        student = lesson.student
        student.last_contact_date = timezone.localdate()
        next_follow_up = request.data.get('next_follow_up')
        if next_follow_up is not None:
            student.next_follow_up = next_follow_up or None
        if lesson.follow_up_notes:
            separator = '\n\n' if student.notes else ''
            student.notes = f'{student.notes}{separator}[Clase {timezone.localdate()}] {lesson.follow_up_notes}'
        student.save()

        return Response(LessonSerializer(lesson, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        lesson = self.get_object()
        scheduled_at = parse_datetime(request.data.get('scheduled_at') or '')
        if not scheduled_at:
            return Response({'error': 'scheduled_at is required'}, status=status.HTTP_400_BAD_REQUEST)
        lesson.scheduled_at = scheduled_at
        lesson.status = 'SCHEDULED'
        lesson.save()
        return Response(LessonSerializer(lesson, context={'request': request}).data)


class WorkTaskViewSet(viewsets.ModelViewSet):
    serializer_class = WorkTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = WorkTask.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        area = self.request.query_params.get('area')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if area:
            queryset = queryset.filter(area=area)
        return queryset.order_by('status', 'due_at', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = 'DONE'
        task.completed_at = timezone.now()
        task.save()
        return Response(WorkTaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        task = self.get_object()
        due_at = parse_datetime(request.data.get('due_at') or '')
        if not due_at:
            return Response({'error': 'due_at is required'}, status=status.HTTP_400_BAD_REQUEST)
        task.due_at = due_at
        if task.status == 'DONE':
            task.status = 'PENDING'
            task.completed_at = None
        task.save()
        return Response(WorkTaskSerializer(task, context={'request': request}).data)


class MonthlyFocusViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch'])
    def current(self, request):
        today = timezone.localdate()
        focus, _ = MonthlyFocus.objects.get_or_create(user=request.user, year=today.year, month=today.month)

        if request.method.lower() == 'patch':
            serializer = MonthlyFocusSerializer(focus, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data)

        return Response(MonthlyFocusSerializer(focus, context={'request': request}).data)


class MonthSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        summary = build_month_summary(request.user, request.query_params.get('month'))
        return Response({
            'period': summary['period'],
            'counts': summary['counts'],
            'today_lessons': LessonSerializer(summary['today_lessons'], many=True, context={'request': request}).data,
            'upcoming_lessons': LessonSerializer(summary['upcoming_lessons'], many=True, context={'request': request}).data,
            'overdue_tasks': WorkTaskSerializer(summary['overdue_tasks'], many=True, context={'request': request}).data,
            'today_tasks': WorkTaskSerializer(summary['today_tasks'], many=True, context={'request': request}).data,
            'upcoming_tasks': WorkTaskSerializer(summary['upcoming_tasks'], many=True, context={'request': request}).data,
            'follow_up_students': StudentSerializer(summary['follow_up_students'], many=True, context={'request': request}).data,
            'focus': MonthlyFocusSerializer(summary['focus'], context={'request': request}).data,
        })
