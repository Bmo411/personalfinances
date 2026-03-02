import requests as http_requests
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
        
        try:
            resp = http_requests.get(
                'https://api.callmebot.com/whatsapp.php',
                params={
                    'phone': phone.strip().replace('+', ''),
                    'text': message,
                    'apikey': apikey.strip(),
                },
                timeout=15
            )
            # CallMeBot returns 200 with "Message queued." on success
            if resp.status_code == 200:
                return Response({'message': 'Mensaje enviado correctamente. Deberías recibirlo en unos segundos.'})
            else:
                return Response({'error': f'CallMeBot respondió con error {resp.status_code}: {resp.text[:200]}'}, status=502)
        except http_requests.exceptions.Timeout:
            return Response({'error': 'Tiempo de espera agotado al contactar CallMeBot.'}, status=504)
        except http_requests.exceptions.RequestException as e:
            return Response({'error': f'No se pudo conectar con CallMeBot: {str(e)}'}, status=502)
