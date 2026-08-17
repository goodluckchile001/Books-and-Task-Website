"""Utilities for timestamped and soft-deletable abstract models.

This module exposes two base classes commonly used across the app:

- `AbstractTimeModel`: provides `created_at`, `updated_at` and a
    stable `uuid` field.
- `AbstractSoftDeleteModel`: extends `AbstractTimeModel` by adding a
    `deleted_at` timestamp and managers that implement soft-delete
    semantics (`objects` excludes deleted rows; `all_objects` returns
    every row).

It also provides `SoftDeleteQuerySet` helpers for bulk soft-delete and
restore operations.

Usage example:

        class MyModel(AbstractSoftDeleteModel):
                name = models.CharField(max_length=100)

        # Normal queries use `MyModel.objects` (excludes soft-deleted rows).
        # Use `MyModel.all_objects` to include deleted rows when needed.
"""

from django.db import models
from django.utils import timezone
import uuid


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet with soft-delete helpers.

    - `delete()` marks rows as deleted by setting `deleted_at`.
    - `restore()` clears the `deleted_at` value.
    Both methods return the number of rows updated (same as
    `QuerySet.update`).
    """

    def delete(self):
        """Soft-delete all records in this queryset.

        Instead of removing rows, set `deleted_at` to the current time.
        """
        return super().update(deleted_at=timezone.now())

    def restore(self):
        """Restore (undelete) all records in this queryset."""
        return super().update(deleted_at=None)


class SoftDeleteManager(models.Manager):
    """Manager that returns only non-deleted objects by default.

    Use `all_objects` (a plain `models.Manager`) on models to access
    all rows including soft-deleted ones.
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(
            deleted_at__isnull=True
        )
class AbstractTimeModel(models.Model):
    """Abstract base model that adds common timestamp and UUID fields.

    Fields:
    - `created_at`: set once when the instance is created
    - `updated_at`: updated automatically on save
    - `uuid`: stable UUID suitable for public lookups
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class AbstractSoftDeleteModel(AbstractTimeModel):
    """Extends `AbstractTimeModel` with soft-delete support.

    Adds a `deleted_at` timestamp and two managers:
    - `objects`: returns only non-deleted rows (uses `SoftDeleteManager`)
    - `all_objects`: returns all rows including soft-deleted ones
    """

    deleted_at = models.DateTimeField(null=True, blank=True)
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    def delete(self, using=None, keep_parents=False):
        """Soft-delete a single instance by setting `deleted_at`."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        """Restore (undelete) a previously soft-deleted instance."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])

    class Meta(AbstractTimeModel.Meta):
        abstract = True
    
