from rest_framework import serializers

from .models import Lesson, MonthlyFocus, NotificationLog, Student, WorkTask


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


class WorkTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkTask
        fields = '__all__'
        read_only_fields = ('user', 'completed_at')


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
