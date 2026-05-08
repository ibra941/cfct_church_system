from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('churches', '0003_district_localchurch_region_zone'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ChurchPageEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page_type', models.CharField(choices=[('financial_oversight', 'Financial Oversight'), ('pastoral_care', 'Pastoral Care'), ('services_planning', 'Services Planning')], max_length=30)),
                ('title_en', models.CharField(max_length=255)),
                ('title_sw', models.CharField(blank=True, max_length=255)),
                ('body_en', models.TextField(blank=True)),
                ('body_sw', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('church', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='page_entries', to='churches.church')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='page_entries_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Church Page Entry',
                'verbose_name_plural': 'Church Page Entries',
                'db_table': 'church_page_entries',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
