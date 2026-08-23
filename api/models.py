"""Model definitions for the API app.

Provides domain models used by the REST API: books, categories,
tasks and user profiles. Models may inherit from
`AbstractTimeModel` (timestamps + UUID) or
`AbstractSoftDeleteModel` (timestamps + UUID + soft-delete).
"""

from django.db import models
from django.contrib.auth.models import User
from .abstractmodel import AbstractTimeModel, AbstractSoftDeleteModel


class Books(AbstractSoftDeleteModel):
    # Core internal performance tracking
    posted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='books')
    downloaded = models.BooleanField(default=False)

    # Standard Book Attributes
    title = models.CharField(max_length=150)
    author = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    isbn = models.CharField(max_length=13, unique=True, blank=True, null=True)
    published_date = models.DateField(null=True, blank=True)
    download_count = models.PositiveBigIntegerField(default=0, help_text='successfull downloads count for this book')

    # MULTI-SOURCE INTEGRATION ROUTER
    SOURCE_CHOICES = [
        ('gutenberg', 'Project Gutenberg'),
        ('openlibrary', 'Open Library'),
    ]
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='openlibrary', db_index=True)
    # Nullable: user-created books (not imported from an external source)
    # have no external source_id. NULLs are exempt from the unique
    # constraint on all major DB backends, so multiple user-created books
    # can each have source_id=None without colliding.
    source_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True,
        help_text="The ID from the external source API (e.g., Gutenberg ID or Open Library Key). Null for user-created books."
    )

    def clean(self):
        super().clean()
        if self.isbn == "":
            self.isbn = None
        if self.source_id == "":
            self.source_id = None

    def save(self, *args, **kwargs):
        if self.isbn == "":
            self.isbn = None
        if self.source_id == "":
            self.source_id = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.source_type.upper()}] {self.title} by {self.author}"

    class Meta(AbstractSoftDeleteModel.Meta):
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
        ("high", "High"),
    ]

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)

    priority = models.CharField(max_length=10, choices=CHOICES, default='medium')

    assigned_to = models.ManyToManyField(User, related_name="assigned_task")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)

    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='tasks')
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

    bio = models.TextField(blank=True)
    phone_no = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    class Meta(AbstractTimeModel.Meta):
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'