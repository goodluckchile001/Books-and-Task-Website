"""Signal handlers for the API app.
Automatically create a `UserProfile` when a new Django `User` is created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, raw=False, **kwargs):
    """Create a `UserProfile` when a `User` is first created.

    Skips fixture loading (raw=True) — loaddata is expected to supply
    its own UserProfile rows if present; running this during a fixture
    load would raise IntegrityError against the OneToOneField's unique
    constraint if the fixture also includes a UserProfile row.
    """
    if created and not raw:
        UserProfile.objects.get_or_create(user=instance)