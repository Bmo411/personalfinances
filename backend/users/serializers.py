from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    whatsapp_apikey = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    whatsapp_key_configured = serializers.SerializerMethodField()

    def get_whatsapp_key_configured(self, user):
        return bool(user.whatsapp_apikey)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'whatsapp_phone', 'whatsapp_apikey', 'whatsapp_enabled', 'whatsapp_key_configured', 'whatsapp_status', 'meditation_reminder_enabled', 'meditation_reminder_time')
        read_only_fields = ('id', 'username', 'email', 'whatsapp_status')
