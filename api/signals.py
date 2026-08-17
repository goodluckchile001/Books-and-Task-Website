"""Signal handlers for the API app.

Automatically create a `UserProfile` when a new Django `User` is created.
"""

from django.db.models.signals import post_save  # 🚀 FIXED: Explicitly imported post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a `UserProfile` when a `User` is first created."""
    if created:
        UserProfile.objects.create(user=instance)
