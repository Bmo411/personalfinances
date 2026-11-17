from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .hub_serializers import ProjectSerializer, NoteSerializer, ProspectSerializer, WorkoutSerializer, MealSerializer, MeditationSerializer
from .hub import today_summary, progress, math_panel


class OwnedViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = self.serializer_class.Meta.model.objects.filter(user=self.request.user)
        if 'project' in self.request.query_params and 'project' in self.serializer_class().fields:
            try:
                project_id = int(self.request.query_params['project'])
            except (ValueError, TypeError):
                raise ValidationError({'project': 'Indica un ID de proyecto válido.'})
            queryset = queryset.filter(project_id=project_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectViewSet(OwnedViewSet):
    serializer_class = ProjectSerializer


class NoteViewSet(OwnedViewSet):
    serializer_class = NoteSerializer


class ProspectViewSet(OwnedViewSet):
    serializer_class = ProspectSerializer


class WorkoutViewSet(OwnedViewSet):
    serializer_class = WorkoutSerializer


class MealViewSet(OwnedViewSet):
    serializer_class = MealSerializer


class MeditationViewSet(OwnedViewSet):
    serializer_class = MeditationSerializer


class TodayView(APIView):
    def get(self, request):
        return Response(today_summary(request.user))


class ProgressView(APIView):
    def get(self, request):
        return Response(progress(request.user))


class MathPanelView(APIView):
    def get(self, request):
        return Response(math_panel(request.user))
