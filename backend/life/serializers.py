from rest_framework import serializers

from .models import Lesson, MonthlyFocus, NotificationLog, Student, WorkTask


class ProjectOwnershipMixin:
    def validate_project(self, project):
        if project and project.user_id != self.context['request'].user.id:
            raise serializers.ValidationError('El proyecto no pertenece a tu cuenta.')
        return project


class StudentSerializer(serializers.ModelSerializer):
    upcoming_lessons_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Student
        fields = '__all__'
        read_only_fields = ('user',)


class LessonSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_subject = serializers.CharField(source='student.subject', read_only=True)

    class Meta:
        model = Lesson
        fields = '__all__'
        read_only_fields = ('user', 'completed_at')

    def validate_student(self, student):
        request = self.context.get('request')
        if request and student.user_id != request.user.id:
            raise serializers.ValidationError('Student does not belong to this user.')
        return student


class WorkTaskSerializer(ProjectOwnershipMixin, serializers.ModelSerializer):
    class Meta:
        model = WorkTask
        fields = '__all__'
        read_only_fields = ('user', 'completed_at')

    def create(self, validated_data):
        from django.utils import timezone
        if validated_data.get('status') == 'DONE':
            validated_data['completed_at'] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.utils import timezone
        if 'status' in validated_data and validated_data['status'] != instance.status:
            validated_data['completed_at'] = timezone.now() if validated_data['status'] == 'DONE' else None
        return super().update(instance, validated_data)


class MonthlyFocusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyFocus
        fields = '__all__'
        read_only_fields = ('user', 'year', 'month')


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = '__all__'
        read_only_fields = ('user',)
