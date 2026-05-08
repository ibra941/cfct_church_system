from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from apps.churches.models import Church
from apps.accounts.models import User

class NewsCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'news_categories'
        verbose_name_plural = 'News Categories'
    
    def __str__(self):
        return self.name

class News(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    )
    
    church = models.ForeignKey(Church, on_delete=models.CASCADE, related_name='news')
    category = models.ForeignKey(NewsCategory, on_delete=models.SET_NULL, null=True, related_name='news')
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    excerpt = models.TextField(blank=True)
    content = models.TextField()
    featured_image = models.ImageField(upload_to='news/', null=True, blank=True)
    images = models.JSONField(default=list, blank=True)
    video_url = models.URLField(blank=True)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='news_articles')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_at = models.DateTimeField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    view_count = models.IntegerField(default=0)
    share_count = models.IntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'news_articles'
        ordering = ['-published_at', '-created_at']
    
    def __str__(self):
        return self.title

    def _generate_unique_slug(self):
        base_slug = slugify(self.title) or 'news-item'
        slug = base_slug
        suffix = 1

        while News.objects.exclude(pk=self.pk).filter(slug=slug).exists():
            suffix += 1
            slug = f'{base_slug}-{suffix}'

        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()

        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()

        super().save(*args, **kwargs)