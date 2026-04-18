from django.test import TestCase
from .models import Department

class DepartmentsTestCase(TestCase):
    def test_department_creation(self):
        self.assertTrue(True)