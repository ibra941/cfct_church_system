from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('churches', '0005_sermon'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChurchPaymentDetails',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('vodacom_lipa_number', models.CharField(default='715001', max_length=30)),
                ('tigo_lipa_number', models.CharField(default='715002', max_length=30)),
                ('airtel_lipa_number', models.CharField(default='715003', max_length=30)),
                ('halotel_lipa_number', models.CharField(default='715004', max_length=30)),
                ('bank_name', models.CharField(default='NMB Bank', max_length=100)),
                ('bank_account_number', models.CharField(default='0150012345678', max_length=50)),
                ('bank_account_name', models.CharField(default='CFCT Church Demo Account', max_length=255)),
                ('bank_branch', models.CharField(blank=True, default='Dar es Salaam Main Branch', max_length=100)),
                ('bank_swift_code', models.CharField(blank=True, default='NMIBTZTZ', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('church', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='payment_details', to='churches.church')),
            ],
            options={
                'db_table': 'church_payment_details',
                'verbose_name': 'Church Payment Details',
                'verbose_name_plural': 'Church Payment Details',
            },
        ),
    ]