from django.conf import settings
from django.db import migrations


def seed(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Project = apps.get_model('life', 'Project')
    for user in User.objects.filter(username='Bmo411').iterator():
        for name, description in [('Blueberries', 'Software'), ('leandm', 'Software y hardware'), ('ujistandard', 'Clientes y seguimiento comercial'), ('Clases de matemáticas', 'Alumnos y planeación docente')]:
            Project.objects.get_or_create(user_id=user.pk, name=name, defaults={'description': description})


class Migration(migrations.Migration):
    dependencies = [('life', '0002_notificationlog_error_notificationlog_status_meal_and_more')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
