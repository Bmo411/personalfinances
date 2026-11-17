from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import LessonViewSet, MonthSummaryView, MonthlyFocusViewSet, StudentViewSet, WorkTaskViewSet
from .hub_views import ProjectViewSet, NoteViewSet, ProspectViewSet, WorkoutViewSet, MealViewSet, MeditationViewSet, TodayView, ProgressView, MathPanelView


router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='life-student')
router.register(r'lessons', LessonViewSet, basename='life-lesson')
router.register(r'tasks', WorkTaskViewSet, basename='life-task')
router.register(r'monthly-focus', MonthlyFocusViewSet, basename='life-monthly-focus')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'prospects', ProspectViewSet, basename='prospect')
router.register(r'workouts', WorkoutViewSet, basename='workout')
router.register(r'meals', MealViewSet, basename='meal')
router.register(r'meditations', MeditationViewSet, basename='meditation')

urlpatterns = [
    path('today/', TodayView.as_view()),
    path('progress/', ProgressView.as_view()),
    path('math-panel/', MathPanelView.as_view()),
    path('month-summary/', MonthSummaryView.as_view(), name='life-month-summary'),
    *router.urls,
]
