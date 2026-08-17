"""Django admin registrations for API models.

Registers `Books`, `Category`, `TaskModel` and `UserProfile` with
custom admin displays and search fields to improve admin usability.
"""

from django.contrib import admin
from .models import Books, Category, TaskModel, UserProfile  


@admin.register(Books)
class BooksAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'isbn', 'published_date', 'uuid', 'created_at']  
    list_filter = ['published_date', 'created_at', 'downloaded']
    search_fields = ['title', 'author', 'isbn']
    readonly_fields = ['uuid', 'created_at', 'updated_at']  


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'color', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TaskModel)
class TaskAdmin(admin.ModelAdmin):  
    list_display = ['title', 'user', 'priority', 'due_date', 'completed', 'category', 'uuid', 'created_at']
    list_filter = ['completed', 'priority', 'category', 'due_date', 'created_at']
    search_fields = ['title', 'description', 'user__username']  
    readonly_fields = ['uuid', 'created_at', 'updated_at']
    filter_horizontal = ['assigned_to']  


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'uuid', 'phone_no', 'website', 'created_at']
    search_fields = ['user__username', 'phone_no', 'bio']
    readonly_fields = ['id', 'uuid', 'created_at', 'updated_at']
