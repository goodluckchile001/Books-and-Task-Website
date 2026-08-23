"""DRF serializers for the API app.

This module defines serializers for `Books`, `TaskModel`, `Category`,
user registration/profile and related payload transformations.
"""

from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.validators import UniqueValidator

from .models import Books, TaskModel, UserProfile, Category


class BookSerializer(serializers.ModelSerializer):
    """Serialize `Books` instances for API input/output.

    - Provides a read-only `owner_username` and a shortened
      description for anonymous requests.
    """
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model = Books
        fields = ['uuid', 'owner_username', 'downloaded',
                   'title', 'description', 'author', 'isbn', 'published_date', 'download_count',
                   'source_type', 'source_id', 'created_at', 'updated_at']
        # NOTE: source_type/source_id are currently writable by any
        # authenticated user on create. If these should only ever be set
        # internally (e.g. the search/import flow), add them here:
        # read_only_fields = ['source_type', 'source_id']

    def get_owner_username(self, obj):
        return obj.posted_by.username if obj.posted_by else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')

        if request and (not request.user or request.user.is_anonymous):
            description = data.get('description')
            if description and len(description) > 40:
                data['description'] = description[:40] + "... [Log in to read more]"
        return data


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for `Category` including a `task_count` field.

    task_count prefers a DB-side annotation (task_count_annotated) set
    by CategoryViewSet.get_queryset() to avoid an N+1 .count() query per
    category in list responses. Falls back to a live query if this
    serializer is ever used against an unannotated queryset.
    """
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'task_count', 'name', 'color', 'created_at']
        read_only_fields = ['id', 'task_count', 'created_at']

    def get_task_count(self, obj):
        if hasattr(obj, 'task_count_annotated'):
            return obj.task_count_annotated
        return obj.taskmodel_set.count()


class UserSerializer(serializers.ModelSerializer):
    """Minimal serializer for Django `User` used nested in other serializers."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class TaskSerializer(serializers.ModelSerializer):
    """Serialize `TaskModel` with nested user and category data.

    category_id / assigned_to_ids are PrimaryKeyRelatedFields so invalid
    IDs are rejected during validation (400) rather than surfacing as a
    DB IntegrityError (500) on save.
    """
    username = serializers.ReadOnlyField(source='user.username')
    taskuser = UserSerializer(source='user', read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category', queryset=Category.objects.all(),
        write_only=True, required=False, allow_null=True
    )
    assigned_to = UserSerializer(many=True, read_only=True)
    assigned_to_ids = serializers.PrimaryKeyRelatedField(
        source='assigned_to', queryset=User.objects.all(),
        many=True, write_only=True, required=False
    )
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = TaskModel
        fields = [
            'uuid', 'title', 'username', 'description', 'created_at', 'taskuser',
            'updated_at', 'completed', 'category', 'category_id', 'priority',
            'assigned_to', 'assigned_to_ids', 'due_date', 'is_overdue'
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']

    def get_is_overdue(self, obj):
        if obj.due_date and not obj.completed:
            return obj.due_date < timezone.now()
        return False

    def create(self, validated_data):
        assigned_to = validated_data.pop("assigned_to", None)

        # 'user' is already in validated_data — TaskViewSet.perform_create
        # calls serializer.save(user=self.request.user), and DRF merges
        # save() kwargs into validated_data before create() runs. Don't
        # re-derive it from request.context and pass it again, or you get
        # "got multiple values for keyword argument 'user'".
        #
        # 'category' (from category_id's source=) is already a resolved
        # Category instance or None, since PrimaryKeyRelatedField resolves
        # it during validation.
        task = TaskModel.objects.create(**validated_data)

        if assigned_to is not None:
            task.assigned_to.set(assigned_to)

        return task

    def update(self, instance, validated_data):
        assigned_to = validated_data.pop("assigned_to", None)
        # Only touch category if category_id was actually sent (PATCH is
        # partial by default) — this correctly leaves the existing
        # category untouched when omitted, and sets/clears it (including
        # explicit null) when provided.
        if 'category' in validated_data:
            instance.category = validated_data.pop('category')

        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.completed = validated_data.get("completed", instance.completed)
        instance.priority = validated_data.get("priority", instance.priority)
        instance.due_date = validated_data.get("due_date", instance.due_date)
        instance.save()

        if assigned_to is not None:
            instance.assigned_to.set(assigned_to)

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer used for user registration.

    Validates `password` and `confirm_pass` match and creates a new
    `User` using `create_user` to ensure proper password hashing.

    `username` is explicitly redeclared (to keep it required/plain
    CharField styling), which means DRF's automatic UniqueValidator
    generation for unique model fields does NOT apply here — it only
    fires for fields DRF generates itself. UniqueValidator is reattached
    explicitly below so a duplicate username is rejected with a clean
    400 instead of crashing with an IntegrityError at User.objects.create_user().
    """
    username = serializers.CharField(
        validators=[
            UnicodeUsernameValidator(),
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with that username already exists."
            ),
        ]
    )
    password = serializers.CharField(write_only=True)
    confirm_pass = serializers.CharField(write_only=True)
    is_superuser = serializers.BooleanField(read_only=True, default=False)
    is_staff = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = User
        fields = ["username", "password", "confirm_pass", "is_superuser", "is_staff"]

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_pass']:
            raise ValidationError({"confirm_pass": "passwords aren't the same"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_pass', None)
        return User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = UserProfile
        fields = ['uuid', 'username', 'email', 'bio', 'phone_no', 'avatar', 'website', 'created_at', 'updated_at']
        read_only_fields = ['uuid', 'created_at']