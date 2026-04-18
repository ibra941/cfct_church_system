from django.test import TestCase
from .models import Church

class ChurchesTestCase(TestCase):
    def test_create_church(self):
        church = Church.objects.create(
            name='Test Church',
            code='TEST-001',
            church_type='local'
        )
        self.assertEqual(church.name, 'Test Church')