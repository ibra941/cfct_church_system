from django.contrib import admin
from .models import Offering

@admin.register(Offering)
class OfferingAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'member', 'amount', 'offering_type', 'payment_date', 'is_verified')
    list_filter = ('offering_type', 'payment_method', 'is_verified')
    search_fields = ('receipt_number', 'member__username', 'transaction_reference')
    date_hierarchy = 'payment_date'