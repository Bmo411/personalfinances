from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='whatsapp_phone',
            field=models.CharField(blank=True, help_text='Phone in international format: +521234567890', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='whatsapp_apikey',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='whatsapp_enabled',
            field=models.BooleanField(default=False),
        ),
    ]
