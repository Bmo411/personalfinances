import urllib.parse
import urllib.request
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
        user = request.user
        phone = user.whatsapp_phone
        apikey = user.whatsapp_apikey

        if not phone or not apikey:
            return Response({'error': 'Configura tu número y API key primero.'}, status=400)

        message = '✅ Conexión exitosa con tu app de finanzas. Las notificaciones de gastos fijos están activas.'
        encoded_message = urllib.parse.quote(message)
        url = f'https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_message}&apikey={apikey}'

        try:
            with urllib.request.urlopen(url, timeout=10) as response:
                body = response.read().decode()
                if response.status == 200:
                    return Response({'message': 'Mensaje enviado correctamente.'})
                else:
                    return Response({'error': f'Error de CallMeBot: {body}'}, status=502)
        except Exception as e:
            return Response({'error': f'No se pudo conectar con CallMeBot: {str(e)}'}, status=502)
