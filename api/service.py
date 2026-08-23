"""User account deletion.

Deleting a Django `User` is non-trivial here because both
`Books.posted_by` and `TaskModel.user` use `on_delete=PROTECT` — a bare
`user.delete()` raises `ProtectedError` the moment the user owns any
book or task. This module centralizes the policy for what happens to a
user's data before the account itself is removed.

Current policy:
  - Books the user owns are SOFT-deleted by default (recoverable via
    `Books.all_objects` / `.restore()`). Pass `hard_delete_books=True`
    to permanently delete them instead.
  - Tasks the user owns are HARD-deleted — TaskModel has no soft-delete
    support yet, so this step is NOT reversible.
  - `assigned_to` (M2M) rows referencing this user clear automatically
    when the user is removed; no action needed.
  - `UserProfile` cascades automatically (on_delete=CASCADE) once the
    PROTECT-guarded relations above are cleared.

Why soft-deleting the books is enough to satisfy PROTECT: Django's
deletion collector checks PROTECT constraints via each related model's
`_base_manager`. On `Books`, `objects` (SoftDeleteManager) is the first
manager declared, so it IS the base manager, and its queryset already
excludes soft-deleted rows. Once deleted_at is set, Django's collector
no longer sees the row as a blocking reference.
"""

from django.contrib.auth.models import User
from django.db import transaction

from .models import Books, TaskModel


def delete_user(user: User, *, hard_delete_books: bool = False) -> dict:
    """Delete a user account, safely unwinding PROTECT-guarded relations first.

    Args:
        user: the User to delete.
        hard_delete_books: if True, permanently delete the user's books
            instead of soft-deleting them. Default False (recoverable).

    Returns:
        Summary dict of what was affected.

    Raises:
        ProtectedError: if some other, currently-unhandled PROTECT
            relation blocks deletion.
    """
    summary = {
        "user_id": user.pk,
        "username": user.username,
        "books_soft_deleted": 0,
        "books_hard_deleted": 0,
        "tasks_hard_deleted": 0,
    }

    with transaction.atomic():
        owned_books = Books.all_objects.filter(posted_by=user, deleted_at__isnull=True)
        book_count = owned_books.count()

        if hard_delete_books:
            Books.all_objects.filter(posted_by=user).delete()
            summary["books_hard_deleted"] = book_count
        else:
            # Note: bulk queryset .delete() does NOT fire pre_delete/
            # post_delete signals — only instance .delete() does.
            owned_books.delete()
            summary["books_soft_deleted"] = book_count

        task_count = TaskModel.objects.filter(user=user).count()
        TaskModel.objects.filter(user=user).delete()
        summary["tasks_hard_deleted"] = task_count

        user.delete()

    return summary