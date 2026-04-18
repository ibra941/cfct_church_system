from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import SiteSetting, HomePageContent

User = get_user_model()

class CMSTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testadmin',
            email='test@test.com',
            password='testpass123',
            is_staff=True
        )
    
    def test_site_setting_creation(self):
        setting = SiteSetting.objects.create(
            key='site_name',
            value='CFCT',
            setting_type='text'
        )
        self.assertEqual(setting.key, 'site_name')
    
    def test_homepage_content_creation(self):
        content = HomePageContent.objects.create(
            section='hero',
            title='Welcome',
            content='Test content'
        )
        self.assertEqual(content.section, 'hero')