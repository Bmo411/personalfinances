from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import LessonViewSet, MonthSummaryView, MonthlyFocusViewSet, StudentViewSet, WorkTaskViewSet


router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='life-student')
router.register(r'lessons', LessonViewSet, basename='life-lesson')
router.register(r'tasks', WorkTaskViewSet, basename='life-task')
router.register(r'monthly-focus', MonthlyFocusViewSet, basename='life-monthly-focus')

urlpatterns = [
    path('month-summary/', MonthSummaryView.as_view(), name='life-month-summary'),
    *router.urls,
]
