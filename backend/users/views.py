from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class WhatsAppTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .whatsapp import send_whatsapp
        result, error = send_whatsapp(
            request.user,
            'Tu guía de vida está conectada. Este es un mensaje de prueba.',
            phone=request.data.get('phone'),
            apikey=request.data.get('apikey'),
        )
        if result == 'ACCEPTED':
            return Response({'status': result, 'message': 'CallMeBot aceptó el envío. Comprueba la recepción en WhatsApp.'})
        return Response({'status': result, 'error': error}, status=502)
