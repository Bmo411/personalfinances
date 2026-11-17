import requests


def send_whatsapp(user, message, phone=None, apikey=None):
    phone = phone or user.whatsapp_phone
    apikey = apikey or user.whatsapp_apikey
    if not phone or not apikey:
        status, error = 'CONFIG_REQUIRED', 'Configura el número y la clave de CallMeBot.'
    else:
        try:
            response = requests.get('https://api.callmebot.com/whatsapp.php', params={
                'phone': str(phone).strip().replace('+', ''), 'text': message, 'apikey': str(apikey).strip(),
            }, timeout=15)
            body = response.text.lower()
            if response.status_code in (400, 401, 403) or any(word in body for word in ('invalid apikey', 'invalid api key', 'not activated', 'not authorized')):
                status, error = 'CONFIG_REQUIRED', 'CallMeBot rechazó la configuración. Revisa la clave y la activación.'
            elif response.status_code == 200 and 'error' not in body:
                status, error = 'ACCEPTED', ''
            else:
                status, error = 'FAILED', 'CallMeBot no confirmó la solicitud.'
        except requests.RequestException:
            status, error = 'UNKNOWN', 'No se pudo confirmar el envío con CallMeBot.'
    user.whatsapp_status = status
    user.save(update_fields=['whatsapp_status'])
    return status, error
