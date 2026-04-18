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
    church_type = models.CharField(max_length=50, blank=True, null=True)
    parent_church = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    code = models.CharField(unique=True, max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'churches'
        managed = False
        ordering = ['church_type', 'name']

    def __str__(self):
        return self.name