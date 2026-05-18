from django.contrib import admin
from .models import Email, Classification, RoutingLog

@admin.register(Email)
class EmailAdmin(admin.ModelAdmin):
    list_display = ['subject', 'sender', 'received_at', 'created_at']
    search_fields = ['subject', 'sender']
    ordering = ['-received_at']

@admin.register(Classification)
class ClassificationAdmin(admin.ModelAdmin):
    list_display = ['email', 'category', 'confidence', 'method', 'requires_review', 'is_active', 'created_at']
    list_filter = ['category', 'method', 'requires_review', 'is_active']
    search_fields = ['email__subject', 'email__sender']

@admin.register(RoutingLog)
class RoutingLogAdmin(admin.ModelAdmin):
    list_display = ['email', 'routed_to', 'status', 'routed_at']
    list_filter = ['status', 'routed_to']
    search_fields = ['email__subject']