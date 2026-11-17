from django.db import migrations, models


def restrict_initial_rollout(apps, schema_editor):
    # Only the requesting account opted in during this feature's rollout.
    User = apps.get_model('users', 'User')
    User.objects.exclude(username='Bmo411').update(meditation_reminder_enabled=False)


class Migration(migrations.Migration):
    dependencies = [('users', '0003_user_meditation_reminder_enabled_and_more')]
    operations = [
        migrations.AlterField(model_name='user', name='meditation_reminder_enabled', field=models.BooleanField(default=False)),
        migrations.RunPython(restrict_initial_rollout, migrations.RunPython.noop),
    ]
