import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command

def add_church_hierarchy():
    # Keep scripts and management workflow aligned by reusing the command.
    call_command('seed_churches')

if __name__ == '__main__':
    add_church_hierarchy()