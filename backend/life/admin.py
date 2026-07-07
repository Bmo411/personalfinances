from django.contrib import admin

from .models import Lesson, MonthlyFocus, NotificationLog, Student, WorkTask


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'status', 'next_follow_up', 'user')
    list_filter = ('status',)
    search_fields = ('name', 'subject', 'goal', 'notes')


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('student', 'topic', 'scheduled_at', 'status', 'user')
    list_filter = ('status', 'reminder_enabled')
    search_fields = ('student__name', 'topic', 'homework', 'follow_up_notes')


@admin.register(WorkTask)
class WorkTaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'area', 'priority', 'due_at', 'status', 'user')
    list_filter = ('area', 'priority', 'status')
    search_fields = ('title', 'notes')


@admin.register(MonthlyFocus)
class MonthlyFocusAdmin(admin.ModelAdmin):
    list_display = ('user', 'year', 'month', 'updated_at')
    list_filter = ('year', 'month')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'channel', 'event_key', 'event_date', 'sent_at')
    list_filter = ('channel', 'event_date')
    search_fields = ('event_key',)
