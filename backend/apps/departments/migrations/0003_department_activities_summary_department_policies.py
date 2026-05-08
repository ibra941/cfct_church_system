from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0002_departmentjoinrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='department',
            name='activities_summary',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='department',
            name='policies',
            field=models.TextField(blank=True),
        ),
    ]
