from django.contrib import admin
from .models import Offering

@admin.register(Offering)
class OfferingAdmin(admin.ModelAdmin):
    list_display = ('receipt_no', 'member', 'amount', 'offering_type', 'payment_method', 'created_at')
    list_filter = ('offering_type', 'payment_method', 'created_at')
    search_fields = ('receipt_no', 'member__username', 'member__email', 'transaction_reference')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'receipt_no')  # REMOVED 'updated_at'
    
    fieldsets = (
        ('Offering Information', {
            'fields': ('church', 'member', 'amount', 'offering_type', 'payment_method')
        }),
        ('Receipt Information', {
            'fields': ('receipt_no', 'transaction_reference')
        }),
        ('Verification', {
            'fields': ('verified_by', 'verified_at', 'notes')
        }),
        ('Metadata', {
            'fields': ('recorded_by', 'created_at'),  # REMOVED 'updated_at'
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not obj.recorded_by:
            obj.recorded_by = request.user
        super().save_model(request, obj, form, change)