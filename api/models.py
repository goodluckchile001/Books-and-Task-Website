"""Model definitions for the API app.

Provides domain models used by the REST API: books, categories,
tasks and user profiles. Models may inherit from
`AbstractTimeModel` (timestamps + UUID) or
`AbstractSoftDeleteModel` (timestamps + UUID + soft-delete).
"""

from django.db import models
from django.contrib.auth.models import User
import uuid
from .abstractmodel import AbstractTimeModel,AbstractSoftDeleteModel


class Books(AbstractSoftDeleteModel):
    """Represents a book posted by a user.

    Fields:
    - `title`: human readable title
    - `posted_by`: user who posted the book
    - `downloaded`: whether the book has been downloaded
    - `description`, `author`, `isbn`, `published_date`
    """
    posted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='books')
    title = models.CharField(max_length=200)
    downloaded = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    author = models.CharField(max_length=100)
    isbn = models.CharField(max_length=13, unique=True, blank=True, null=True)
    published_date = models.DateField()

    def __str__(self):
        return f"{self.title} by {self.author}"
        
    class Meta(AbstractTimeModel.Meta):
        verbose_name = "Book"
        verbose_name_plural = "Books"


class Category(AbstractTimeModel):
    """A category to group books or tasks.

    Stores a unique `name` and optional hex `color` value.
    """
    name = models.CharField(max_length=50, unique=True)
    
    color = models.CharField(max_length=7, default='#000000')

    def __str__(self):
        return self.name
    
    class Meta(AbstractTimeModel.Meta):
        verbose_name = "Category"
        verbose_name_plural = "Categories"


class TaskModel(AbstractTimeModel):
    """Represents a user task with priority, assignees and due date."""
   
    CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High")
    ]

    
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True) 
    due_date = models.DateTimeField(null=True, blank=True)
    
    
    priority = models.CharField(max_length=10, choices=CHOICES, default='medium')
    
    assigned_to = models.ManyToManyField(User, related_name="assigned_task")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    completed = models.BooleanField(default=False)

    def __str__(self):
        return self.title
        
    class Meta(AbstractTimeModel.Meta):
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'


class UserProfile(AbstractTimeModel):
    """Profile information attached to Django `User`.

    Contains optional bio, contact fields and avatar upload.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    id = models.BigAutoField(primary_key=True)
    
    bio = models.TextField(blank=True)
    phone_no = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True)
  
    def __str__(self):
        return f"{self.user.username}'s profile"
        
    class Meta(AbstractTimeModel.Meta):
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
