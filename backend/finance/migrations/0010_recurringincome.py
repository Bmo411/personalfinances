from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('finance', '0009_financialprofile_transaction_spending_kind'),
    ]

    operations = [
        migrations.CreateModel(
            name='RecurringIncome',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('due_day', models.IntegerField(help_text='Day of the month this income is expected (1-31)')),
                ('source_type', models.CharField(choices=[('ACTIVE', 'Ingreso activo'), ('PASSIVE', 'Ingreso pasivo'), ('OTHER', 'Otro ingreso fijo')], default='ACTIVE', max_length=10)),
                ('auto_create', models.BooleanField(default=True)),
                ('is_active', models.BooleanField(default=True)),
                ('last_received_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account', models.ForeignKey(blank=True, help_text='Default account to receive into', null=True, on_delete=django.db.models.deletion.SET_NULL, to='finance.account')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='finance.category')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recurring_incomes', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AlterField(
            model_name='recurringexpense',
            name='due_day',
            field=models.IntegerField(help_text='Day of the month this expense is due (1-31)'),
        ),
    ]
