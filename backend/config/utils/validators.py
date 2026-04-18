import re
from django.core.exceptions import ValidationError

def validate_phone_number(value):
    """Validate phone number format."""
    pattern = r'^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$'
    if not re.match(pattern, value):
        raise ValidationError('Invalid phone number format')

def validate_tanzania_phone(value):
    """Validate Tanzania phone number format."""
    pattern = r'^(0|255|\+255)[67]\d{8}$'
    if not re.match(pattern, value):
        raise ValidationError('Invalid Tanzania phone number format')

def validate_email(value):
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, value):
        raise ValidationError('Invalid email format')