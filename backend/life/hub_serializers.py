from django.db import transaction
from rest_framework import serializers

from .models import Project, Note, Prospect, Workout, WorkoutSet, Meal, Meditation
from .serializers import ProjectOwnershipMixin


class OwnedSerializer(ProjectOwnershipMixin, serializers.ModelSerializer):
    class Meta:
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')


class ProjectSerializer(OwnedSerializer):
    class Meta(OwnedSerializer.Meta):
        model = Project
        validators = []

    def validate_name(self, value):
        others = Project.objects.filter(user=self.context['request'].user, name=value)
        if self.instance:
            others = others.exclude(pk=self.instance.pk)
        if others.exists():
            raise serializers.ValidationError('Ya existe un proyecto con ese nombre.')
        return value


class NoteSerializer(OwnedSerializer):
    class Meta(OwnedSerializer.Meta):
        model = Note


class ProspectSerializer(OwnedSerializer):
    class Meta(OwnedSerializer.Meta):
        model = Prospect


class WorkoutSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = ('id', 'exercise', 'reps', 'weight_kg')
        read_only_fields = ('id',)


class WorkoutSerializer(OwnedSerializer):
    sets = WorkoutSetSerializer(many=True, allow_empty=False)

    class Meta(OwnedSerializer.Meta):
        model = Workout

    @transaction.atomic
    def create(self, validated_data):
        sets = validated_data.pop('sets')
        workout = super().create(validated_data)
        WorkoutSet.objects.bulk_create([WorkoutSet(workout=workout, **item) for item in sets])
        return workout

    @transaction.atomic
    def update(self, instance, validated_data):
        sets = validated_data.pop('sets', None)
        workout = super().update(instance, validated_data)
        if sets is not None:
            workout.sets.all().delete()
            WorkoutSet.objects.bulk_create([WorkoutSet(workout=workout, **item) for item in sets])
        return workout


class MealSerializer(OwnedSerializer):
    class Meta(OwnedSerializer.Meta):
        model = Meal


class MeditationSerializer(OwnedSerializer):
    class Meta(OwnedSerializer.Meta):
        model = Meditation
