from django.db import models
from apps.accounts.models import User

class SiteSetting(models.Model):
    """Global site settings"""
    SETTING_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('html', 'HTML'),
        ('json', 'JSON'),
    )
    
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    setting_type = models.CharField(max_length=20, choices=SETTING_TYPES, default='text')
    description = models.TextField(blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cms_site_settings'
        verbose_name = 'Site Setting'
        verbose_name_plural = 'Site Settings'
    
    def __str__(self):
        return self.key


class HomePageContent(models.Model):
    """Homepage content sections"""
    SECTION_CHOICES = (
        ('hero', 'Hero Section'),
        ('vision', 'Vision Section'),
        ('mission', 'Mission Section'),
        ('history', 'History Section'),
        ('about', 'About Section'),
        ('welcome', 'Welcome Section'),
    )
    
    section = models.CharField(max_length=50, choices=SECTION_CHOICES, unique=True)
    title = models.CharField(max_length=255, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    image = models.ImageField(upload_to='cms/homepage/', null=True, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cms_homepage_content'
        ordering = ['order', 'section']
        verbose_name = 'Homepage Content'
        verbose_name_plural = 'Homepage Contents'
    
    def __str__(self):
        return f"{self.get_section_display()}"


class SocialMediaLink(models.Model):
    """Social media links for footer"""
    PLATFORM_CHOICES = (
        ('facebook', 'Facebook'),
        ('twitter', 'Twitter'),
        ('instagram', 'Instagram'),
        ('youtube', 'YouTube'),
        ('whatsapp', 'WhatsApp'),
        ('telegram', 'Telegram'),
        ('linkedin', 'LinkedIn'),
    )
    
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES, unique=True)
    url = models.URLField()
    icon_class = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cms_social_media_links'
        ordering = ['order']
        verbose_name = 'Social Media Link'
        verbose_name_plural = 'Social Media Links'
    
    def __str__(self):
        return self.get_platform_display()


class ContactInfo(models.Model):
    """Contact information for footer and contact page"""
    contact_type = models.CharField(max_length=50, unique=True)
    value = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cms_contact_info'
        ordering = ['order']
        verbose_name = 'Contact Info'
        verbose_name_plural = 'Contact Info'
    
    def __str__(self):
        return f"{self.contact_type}: {self.value}"


class FooterLink(models.Model):
    """Footer quick links"""
    title = models.CharField(max_length=100)
    url = models.CharField(max_length=255)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cms_footer_links'
        ordering = ['order']
        verbose_name = 'Footer Link'
        verbose_name_plural = 'Footer Links'
    
    def __str__(self):
        return self.title


class ContactMessage(models.Model):
    """Public contact form submissions."""
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cms_contact_messages'
        ordering = ['-created_at']
        verbose_name = 'Contact Message'
        verbose_name_plural = 'Contact Messages'

    def __str__(self):
        return f"{self.name} <{self.email}>"