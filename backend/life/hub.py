import datetime
from decimal import Decimal

from django.db.models import Sum, Max
from django.utils import timezone

from .models import Workout, WorkoutSet, Meal, Meditation, MathSnapshot, WorkTask, Lesson, Prospect
from .serializers import WorkTaskSerializer, LessonSerializer
from .quotes import daily_quote


def weekly_metrics(user, start, end):
    workouts = Workout.objects.filter(user=user, date__gte=start, date__lte=end)
    sets = WorkoutSet.objects.filter(workout__in=workouts)
    meals = Meal.objects.filter(user=user, date__gte=start, date__lte=end)
    nutrition = {}
    for field in ('calories', 'protein_g', 'carbs_g', 'fat_g'):
        nutrition[field] = {
            'total': meals.aggregate(value=Sum(field))['value'],
            'missing': meals.filter(**{f'{field}__isnull': True}).count(),
        }
    return {
        'start': start, 'end': end,
        'sessions': workouts.count(), 'sets': sets.count(),
        'volume_kg': sum((item.weight_kg * item.reps for item in sets), Decimal('0')),
        'exercises': list(sets.values('exercise').annotate(max_kg=Max('weight_kg')).order_by('exercise')),
        'meal_days': meals.values('date').distinct().count(), 'meals': meals.count(),
        'nutrition': nutrition,
        'meditation_days': Meditation.objects.filter(user=user, date__gte=start, date__lte=end).values('date').distinct().count(),
        'meditation_minutes': Meditation.objects.filter(user=user, date__gte=start, date__lte=end).aggregate(total=Sum('minutes'))['total'] or 0,
    }


def progress(user):
    today = timezone.localdate()
    start = today - datetime.timedelta(days=today.weekday())
    return {
        'current': weekly_metrics(user, start, today),
        'previous': weekly_metrics(user, start - datetime.timedelta(days=7), today - datetime.timedelta(days=7)),
        'comparison': 'Mismos días de la semana anterior',
    }


def math_panel(user):
    snapshot = MathSnapshot.objects.filter(user=user, source='matematicas').first()
    if not snapshot:
        return {'updated_at': None, 'students': [], 'panel': '', 'plans': []}
    return {**snapshot.payload, 'updated_at': snapshot.updated_at, 'digest': snapshot.digest}


def today_summary(user):
    today = timezone.localdate()
    tasks = WorkTask.objects.filter(user=user, status__in=['PENDING', 'IN_PROGRESS'])
    next_lesson = Lesson.objects.filter(user=user, status='SCHEDULED', scheduled_at__gte=timezone.now()).select_related('student').first()
    return {
        'date': today, 'quote': daily_quote(today),
        'today_tasks': WorkTaskSerializer(tasks.filter(due_at__date=today).order_by('due_at'), many=True).data,
        'overdue_tasks': WorkTaskSerializer(tasks.filter(due_at__date__lt=today).order_by('due_at')[:20], many=True).data,
        'unscheduled_tasks': tasks.filter(due_at__isnull=True).count(),
        'next_lesson': LessonSerializer(next_lesson).data if next_lesson else None,
        'progress': progress(user),
        'followups': list(Prospect.objects.filter(user=user, next_follow_up__lte=today).exclude(stage__in=['WON', 'LOST']).values('id', 'name', 'next_follow_up')),
    }
