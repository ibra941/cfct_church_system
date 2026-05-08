from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceCheckIn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('service_date', models.DateField()),
                ('service_type', models.CharField(choices=[('sunday', 'Sunday Service'), ('midweek', 'Midweek Service'), ('prayer', 'Prayer Meeting'), ('conference', 'Conference'), ('special', 'Special Service'), ('other', 'Other')], default='sunday', max_length=32)),
                ('service_title', models.CharField(blank=True, max_length=255)),
                ('checkin_token', models.CharField(blank=True, max_length=512)),
                ('checked_in_at', models.DateTimeField(auto_now_add=True)),
                ('church', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='member_checkins', to='churches.church')),
                ('member', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='attendance_checkins', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'attendance_checkins',
                'ordering': ['-service_date', '-checked_in_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='attendancecheckin',
            constraint=models.UniqueConstraint(fields=('church', 'member', 'service_date', 'service_type', 'service_title'), name='unique_member_checkin_per_service'),
        ),
    ]
