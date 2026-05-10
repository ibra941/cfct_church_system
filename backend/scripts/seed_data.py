import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command

def seed_data():
    # Keep scripts and management workflow aligned by reusing the command.
    call_command('seed_churches')

if __name__ == '__main__':
    seed_data()