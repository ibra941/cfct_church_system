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
    church_type = models.CharField(max_length=50, choices=CHURCH_TYPES)
    parent_church = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
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
    
    class Meta:
        db_table = 'churches'
        ordering = ['church_type', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_church_type_display()})"
    
    def get_hierarchy(self):
        hierarchy = []
        church = self
        while church:
            hierarchy.append({
                'id': church.id,
                'name': church.name,
                'type': church.church_type
            })
            church = church.parent_church
        return hierarchy[::-1]


# ---------------------------------------------------------------------------
# Proxy models – one per hierarchy level.
# Each uses the same 'churches' DB table but gets its own admin section.
# ---------------------------------------------------------------------------

class Zone(Church):
    class Meta:
        proxy = True
        verbose_name = 'Zone'
        verbose_name_plural = 'Zones'

    def save(self, *args, **kwargs):
        self.church_type = 'zone'
        super().save(*args, **kwargs)


class Region(Church):
    class Meta:
        proxy = True
        verbose_name = 'Region'
        verbose_name_plural = 'Regions'

    def save(self, *args, **kwargs):
        self.church_type = 'region'
        super().save(*args, **kwargs)


class District(Church):
    class Meta:
        proxy = True
        verbose_name = 'District'
        verbose_name_plural = 'Districts'

    def save(self, *args, **kwargs):
        self.church_type = 'district'
        super().save(*args, **kwargs)


class LocalChurch(Church):
    class Meta:
        proxy = True
        verbose_name = 'Local Church'
        verbose_name_plural = 'Local Churches'

    def save(self, *args, **kwargs):
        self.church_type = 'local'
        super().save(*args, **kwargs)