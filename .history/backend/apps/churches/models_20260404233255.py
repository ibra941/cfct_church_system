from django.db import models

class Church(models.Model):
    CHURCH_TYPES = (
        ('national', 'National'),
        ('zone', 'Zone'),
        ('region', 'Region'),
        ('district', 'District'),
        ('local', 'Local'),
    )
    
    name = models.CharField(max_length=255)
    code = models.CharField(unique=True, max_length=50, blank=True, null=True)
    church_type = models.CharField(max_length=50, choices=CHURCH_TYPES, blank=True, null=True)
    parent_church = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Tanzania')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to='church_logos/', null=True, blank=True)
    established_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_church_type_display()})"

    class Meta:
        db_table = 'churches'
        managed = False
        ordering = ['church_type', 'name']