from django.db import models
from django.contrib.auth.models import User
import uuid

class Email(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message_id = models.CharField(max_length=255, unique=True)
    sender = models.EmailField()
    subject = models.CharField(max_length=500)
    received_at = models.DateTimeField()
    raw_body_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.subject} — {self.sender}"


class Classification(models.Model):

    class Category(models.TextChoices):
        IT_TECHNICAL = 'IT Technical', 'IT Technical'
        MARKETING = 'Marketing', 'Marketing'
        TAX = 'Tax', 'Tax'
        OTHERS = 'Others', 'Others'
        NO_ACTION = 'No Action Required', 'No Action Required'
        UNCLASSIFIED = 'Unclassified', 'Unclassified'

    class Method(models.TextChoices):
        AI = 'ai', 'AI'
        RULES = 'rules', 'Rules'
        MANUAL = 'manual', 'Manual'

    email = models.ForeignKey(Email, on_delete=models.CASCADE, related_name='classifications')
    category = models.CharField(max_length=50, choices=Category.choices)
    confidence = models.FloatField()
    method = models.CharField(max_length=10, choices=Method.choices)
    reason = models.TextField()
    requires_review = models.BooleanField(default=False)
    corrected_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='corrections'
    )
    corrected_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email.subject} → {self.category} ({self.confidence:.0%})"


class RoutingLog(models.Model):

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        PENDING = 'pending', 'Pending'

    email = models.ForeignKey(Email, on_delete=models.CASCADE, related_name='routing_logs')
    classification = models.ForeignKey(Classification, on_delete=models.CASCADE)
    routed_to = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)
    routed_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.email.subject} → {self.routed_to} [{self.status}]"