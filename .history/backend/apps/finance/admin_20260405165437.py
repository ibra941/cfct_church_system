from django.contrib import admin
from .models import FinancialTransaction

@admin.register(FinancialTransaction)
class FinancialTransactionAdmin(admin.ModelAdmin):
    list_display = ('church', 'transaction_type', 'category', 'amount', 'transaction_date')
    list_filter = ('transaction_type', 'category')
    date_hierarchy = 'transaction_date'