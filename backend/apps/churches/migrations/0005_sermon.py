from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('churches', '0004_churchpageentry'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Sermon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('speaker', models.CharField(blank=True, max_length=255)),
                ('sermon_date', models.DateField()),
                ('description', models.TextField(blank=True)),
                ('scripture_reference', models.CharField(blank=True, max_length=255)),
                ('audio_url', models.URLField(blank=True)),
                ('video_url', models.URLField(blank=True)),
                ('series_name', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('church', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sermons', to='churches.church')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sermons_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Sermon',
                'verbose_name_plural': 'Sermons',
                'db_table': 'sermons',
                'ordering': ['-sermon_date', '-created_at'],
            },
        ),
    ]
