"""Permission helpers for the API.

Includes `IsOwnerOrReadOnly` which allows safe (read-only) methods
to all users while restricting write operations to the resource owner.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow read-only methods for anyone, write methods only for owner.

    The owner is determined by looking for a `posted_by` attribute and
    falling back to a `user` attribute if present on the object.
    If no owner attribute exists, write access is denied.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        owner = getattr(obj, 'posted_by', None)
        if owner is None:
            owner = getattr(obj, 'user', None)

        # If the object does not have an owner attribute, deny write access.
        if owner is None:
            return False
        
        return owner == request.user
