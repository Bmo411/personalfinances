from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Student(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Activo'),
        ('PAUSED', 'Pausado'),
        ('COMPLETED', 'Completado'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='life_students')
    name = models.CharField(max_length=150)
    subject = models.CharField(max_length=150, blank=True)
    goal = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='ACTIVE')
    notes = models.TextField(blank=True)
    last_contact_date = models.DateField(null=True, blank=True)
    next_follow_up = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'next_follow_up']),
        ]

    def __str__(self):
        return self.name


class Lesson(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Programada'),
        ('COMPLETED', 'Completada'),
        ('CANCELED', 'Cancelada'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='life_lessons')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='lessons')
    scheduled_at = models.DateTimeField()
    topic = models.CharField(max_length=180)
    homework = models.TextField(blank=True)
    follow_up_notes = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='SCHEDULED')
    reminder_enabled = models.BooleanField(default=True)
    reminder_minutes = models.PositiveSmallIntegerField(default=60)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['user', 'scheduled_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f'{self.student.name} - {self.topic}'


class WorkTask(models.Model):
    AREA_CHOICES = (
        ('WORK', 'Trabajo'),
        ('BUSINESS', 'Empresa'),
        ('PERSONAL', 'Personal'),
        ('CLASS', 'Clases'),
    )
    PRIORITY_CHOICES = (
        ('LOW', 'Baja'),
        ('MEDIUM', 'Media'),
        ('HIGH', 'Alta'),
        ('URGENT', 'Urgente'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pendiente'),
        ('IN_PROGRESS', 'En progreso'),
        ('DONE', 'Hecho'),
        ('CANCELED', 'Cancelado'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='life_tasks')
    project = models.ForeignKey('Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    title = models.CharField(max_length=180)
    area = models.CharField(max_length=12, choices=AREA_CHOICES, default='WORK')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    due_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    reminder_enabled = models.BooleanField(default=True)
    reminder_minutes = models.PositiveSmallIntegerField(default=1440)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['status', 'due_at', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'due_at']),
            models.Index(fields=['user', 'area']),
        ]

    def __str__(self):
        return self.title


class MonthlyFocus(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='monthly_focuses')
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    company_focus = models.TextField(blank=True)
    skills_focus = models.TextField(blank=True)
    personal_focus = models.TextField(blank=True)
    health_focus = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month']
        constraints = [
            models.UniqueConstraint(fields=['user', 'year', 'month'], name='unique_monthly_focus_per_user_month'),
        ]
        indexes = [
            models.Index(fields=['user', 'year', 'month']),
        ]

    def __str__(self):
        return f'{self.user} {self.year}-{self.month:02d}'


class NotificationLog(models.Model):
    CHANNEL_CHOICES = (
        ('WHATSAPP', 'WhatsApp'),
        ('TELEGRAM', 'Telegram'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='life_notification_logs')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='WHATSAPP')
    event_key = models.CharField(max_length=180)
    event_date = models.DateField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='SENT')
    error = models.CharField(max_length=250, blank=True)

    class Meta:
        ordering = ['-sent_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'channel', 'event_key', 'event_date'], name='unique_life_notification_event'),
        ]
        indexes = [
            models.Index(fields=['user', 'channel', 'event_date']),
        ]

    def __str__(self):
        return f'{self.channel}: {self.event_key} @ {self.event_date}'


class OwnedRecord(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class Project(OwnedRecord):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=[('ACTIVE', 'Activo'), ('PAUSED', 'Pausado'), ('DONE', 'Terminado')], default='ACTIVE')

    class Meta(OwnedRecord.Meta):
        ordering = ['name']
        constraints = [models.UniqueConstraint(fields=['user', 'name'], name='unique_user_project')]


class Note(OwnedRecord):
    title = models.CharField(max_length=180)
    body = models.TextField()
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    pinned = models.BooleanField(default=False)

    class Meta(OwnedRecord.Meta):
        ordering = ['-pinned', '-updated_at']


class Prospect(OwnedRecord):
    name = models.CharField(max_length=150)
    company = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    stage = models.CharField(max_length=12, choices=[('NEW', 'Nuevo'), ('CONTACTED', 'Contactado'), ('PROPOSAL', 'Propuesta'), ('WON', 'Ganado'), ('LOST', 'Cerrado')], default='NEW')
    next_follow_up = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)


class Workout(OwnedRecord):
    date = models.DateField()
    title = models.CharField(max_length=150)
    notes = models.TextField(blank=True)

    class Meta(OwnedRecord.Meta):
        ordering = ['-date', '-created_at']


class WorkoutSet(models.Model):
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name='sets')
    exercise = models.CharField(max_length=150)
    reps = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    weight_kg = models.DecimalField(max_digits=7, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ['id']


class Meal(OwnedRecord):
    date = models.DateField()
    name = models.CharField(max_length=150)
    portion = models.CharField(max_length=180)
    calories = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    protein_g = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    carbs_g = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    fat_g = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)

    class Meta(OwnedRecord.Meta):
        ordering = ['-date', '-created_at']


class Meditation(OwnedRecord):
    date = models.DateField()
    minutes = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(1440)])
    reflection = models.TextField(blank=True)

    class Meta(OwnedRecord.Meta):
        ordering = ['-date', '-created_at']


class MathSnapshot(OwnedRecord):
    source = models.CharField(max_length=60, default='matematicas')
    digest = models.CharField(max_length=64)
    payload = models.JSONField()

    class Meta(OwnedRecord.Meta):
        constraints = [models.UniqueConstraint(fields=['user', 'source'], name='unique_user_math_source')]
