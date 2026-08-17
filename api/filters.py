"""Filtering classes for `Books` and `TaskModel` used by viewsets.

These FilterSet classes expose convenient query parameters for the
API endpoints (e.g. `published_after`, `created_before`).
"""

import django_filters
from .models import Books, TaskModel


class BookFilter(django_filters.FilterSet):
    """Filters for `Books` resources."""

    author = django_filters.CharFilter(lookup_expr='icontains')
    published_after = django_filters.DateFilter(field_name="published_date", lookup_expr="gte")
    published_before = django_filters.DateFilter(field_name="published_date", lookup_expr='lte')

    class Meta:
        model = Books 
        fields = ["author", 'published_after', "published_before"]


class TaskFilter(django_filters.FilterSet):
    """Filters for `TaskModel` resources."""

    completed = django_filters.BooleanFilter()
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")
    
    class Meta:
        model = TaskModel
        fields = ["completed", 'created_after', 'created_before']
