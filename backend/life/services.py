import datetime

from django.db.models import Count, Q
from django.utils import timezone

from .models import Lesson, MonthlyFocus, Student, WorkTask


OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS']


def month_bounds(month_value=None):
    today = timezone.localdate()
    if month_value:
        try:
            year, month = [int(part) for part in month_value.split('-', 1)]
            start = datetime.date(year, month, 1)
        except (AttributeError, TypeError, ValueError):
            start = today.replace(day=1)
    else:
        start = today.replace(day=1)

    if start.month == 12:
        end = datetime.date(start.year, 12, 31)
    else:
        end = datetime.date(start.year, start.month + 1, 1) - datetime.timedelta(days=1)

    return start, end


def build_month_summary(user, month_value=None):
    today = timezone.localdate()
    start, end = month_bounds(month_value)
    month_start = timezone.make_aware(datetime.datetime.combine(start, datetime.time.min))
    month_end = timezone.make_aware(datetime.datetime.combine(end, datetime.time.max))
    today_start = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
    today_end = timezone.make_aware(datetime.datetime.combine(today, datetime.time.max))
    next_week_end = timezone.make_aware(
        datetime.datetime.combine(today + datetime.timedelta(days=7), datetime.time.max)
    )

    lesson_base = Lesson.objects.filter(user=user)
    task_base = WorkTask.objects.filter(user=user)
    active_students = Student.objects.filter(user=user, status='ACTIVE')
    focus, _ = MonthlyFocus.objects.get_or_create(user=user, year=start.year, month=start.month)

    month_lessons = lesson_base.filter(scheduled_at__gte=month_start, scheduled_at__lte=month_end)
    completed_lessons = month_lessons.filter(status='COMPLETED').count()
    scheduled_lessons = month_lessons.exclude(status='CANCELED').count()
    open_tasks = task_base.filter(status__in=OPEN_TASK_STATUSES)

    today_lessons = lesson_base.filter(
        status='SCHEDULED',
        scheduled_at__gte=today_start,
        scheduled_at__lte=today_end,
    ).select_related('student').order_by('scheduled_at')
    upcoming_lessons = lesson_base.filter(
        status='SCHEDULED',
        scheduled_at__gte=timezone.now(),
        scheduled_at__lte=month_end,
    ).select_related('student').order_by('scheduled_at')[:8]
    overdue_tasks = open_tasks.filter(due_at__lt=today_start).order_by('due_at', '-priority')
    today_tasks = open_tasks.filter(due_at__gte=today_start, due_at__lte=today_end).order_by('due_at', '-priority')
    upcoming_tasks = open_tasks.filter(due_at__gt=today_end, due_at__lte=next_week_end).order_by('due_at')[:8]
    follow_up_students = active_students.filter(
        Q(next_follow_up__isnull=False, next_follow_up__lte=today)
    ).annotate(upcoming_lessons_count=Count('lessons', filter=Q(lessons__status='SCHEDULED'))).order_by('next_follow_up', 'name')[:8]

    return {
        'period': {
            'month': f'{start.year}-{start.month:02d}',
            'start': start,
            'end': end,
            'today': today,
        },
        'counts': {
            'active_students': active_students.count(),
            'scheduled_lessons': scheduled_lessons,
            'completed_lessons': completed_lessons,
            'open_tasks': open_tasks.count(),
            'overdue_tasks': overdue_tasks.count(),
            'follow_up_students': follow_up_students.count(),
        },
        'today_lessons': list(today_lessons),
        'upcoming_lessons': list(upcoming_lessons),
        'overdue_tasks': list(overdue_tasks[:8]),
        'today_tasks': list(today_tasks),
        'upcoming_tasks': list(upcoming_tasks),
        'follow_up_students': list(follow_up_students),
        'focus': focus,
    }
