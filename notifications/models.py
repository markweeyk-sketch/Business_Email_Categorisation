from django.db import models
from django.contrib.auth.models import User


class PushDevice(models.Model):
    """An Expo push token registered by a logged-in mobile app user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_devices')
    token = models.CharField(max_length=200, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} — {self.token[:30]}… [{'active' if self.is_active else 'inactive'}]"
