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

Note on signals: soft-delete does NOT fire Django's pre_delete/post_delete
signals automatically, since no row is actually removed. We dispatch them
manually below so that receivers (audit logging, cache invalidation, etc.)
still run consistently, whether a row is hard- or soft-deleted.
"""

from django.db import models
from django.db.models.signals import pre_delete, post_delete
from django.utils import timezone
import uuid


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet with soft-delete helpers.

    - `delete()` marks rows as deleted by setting `deleted_at`.
    - `restore()` clears the `deleted_at` value.
    Both methods return the number of rows updated (same as
    `QuerySet.update`).

    Note: bulk delete()/restore() do NOT fire pre_delete/post_delete
    signals (same as Django's own QuerySet.update() behavior). Only the
    instance-level delete() below dispatches signals. If you need
    signals on bulk soft-delete, iterate and call .delete() per instance.
    """

    def delete(self):
        """Soft-delete all records in this queryset."""
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
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class AbstractSoftDeleteModel(AbstractTimeModel):
    """Extends `AbstractTimeModel` with soft-delete support.

    Adds a `deleted_at` timestamp and two managers:
    - `objects`: returns only non-deleted rows (uses `SoftDeleteManager`)
    - `all_objects`: returns all rows including soft-deleted ones

    IMPORTANT: reverse FK relations (e.g. `user.books.all()`) use the
    model's default manager, which is `objects` (SoftDeleteManager) here
    since it's declared first. That means reverse traversal will also
    silently exclude soft-deleted rows, with no way to reach `all_objects`
    through the accessor. If you need "all of this user's books including
    deleted", query `Books.all_objects.filter(posted_by=user)` directly.
    """

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    def delete(self, using=None, keep_parents=False):
        """Soft-delete a single instance by setting `deleted_at`.

        Dispatches pre_delete/post_delete signals manually so receivers
        behave consistently regardless of hard vs. soft delete.
        """
        using = using or self._state.db
        pre_delete.send(sender=self.__class__, instance=self, using=using)
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])
        post_delete.send(sender=self.__class__, instance=self, using=using)

    def restore(self):
        """Restore (undelete) a previously soft-deleted instance."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])

    class Meta(AbstractTimeModel.Meta):
        abstract = True