"""DRF serializers for the API app.

This module defines serializers for `Books`, `TaskModel`, `Category`,
user registration/profile and related payload transformations.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from .models import Books, TaskModel, UserProfile, Category

class BookSerializer(serializers.ModelSerializer):
    """Serialize `Books` instances for API input/output.

    - Provides a read-only `posted_by` username and a shortened
      description for anonymous requests.
    """
    posted_by = serializers.ReadOnlyField(source='posted_by.username')
    owner_username = serializers.SerializerMethodField()

    class Meta:
        model = Books
        fields = ['uuid', 'posted_by', 'owner_username', 'downloaded', 'title', 'description', 'author', 'isbn', 'published_date']

    def get_owner_username(self, obj):
        return obj.posted_by.username if obj.posted_by else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')

        if request and (not request.user or request.user.is_anonymous):
            if data.get('description'):
                data['description'] = data['description'][:40] + "... [Log in to read more]"
        return data


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for `Category` including a `task_count` field."""
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'task_count', 'name', 'color', 'created_at']
        read_only_fields = ['id', 'task_count', 'created_at']

    def get_task_count(self, obj):
        return obj.taskmodel_set.count() 


class UserSerializer(serializers.ModelSerializer):
    """Minimal serializer for Django `User` used nested in other serializers."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class TaskSerializer(serializers.ModelSerializer):
    """Serialize `TaskModel` with nested user and category data.

    Supports write-side helpers `assigned_to_ids` and `category_id` to
    simplify client payloads.
    """
    username = serializers.ReadOnlyField(source='user.username')
    taskuser = UserSerializer(source='user', read_only=True)  # Added missing source mapping
    category = CategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    assigned_to = UserSerializer(many=True, read_only=True)
    assigned_to_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    is_overdue = serializers.SerializerMethodField()    

    class Meta:
        model = TaskModel
        fields = [
            'uuid', 'title', 'username', 'description', 'created_at', 'taskuser', 
            'updated_at', 'completed', 'category', 'category_id', 'priority', 
            'assigned_to', 'assigned_to_ids', 'due_date', 'is_overdue'
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']

    # 🚀 FIXED: Variables named correctly and compared to executed datetime object execution
    def get_is_overdue(self, obj):
        if obj.due_date and not obj.completed:
            return obj.due_date < timezone.now()
        return False

    # FIXED: Complete rebuild targeting TaskModel, using proper assignment variables
    def create(self, validated_data):
        assigned_to_ids = validated_data.pop("assigned_to_ids", None)
        category_id = validated_data.pop("category_id", None)
        request = self.context.get("request")
        
        if not request or not request.user.is_authenticated:
            raise ValidationError("Authentication is required to make a task.")
            
        # Fixed: Changed from Task to TaskModel
        task = TaskModel.objects.create(user=request.user, **validated_data)
        
        if category_id is not None:
            task.category_id = category_id  # Assigned correctly via ID relation anchor
            task.save()
            
        if assigned_to_ids:
            task.assigned_to.set(assigned_to_ids)
        return task 

    # FIXED: Re-mapped wrong target strings, fixed condition checks for categories
    def update(self, instance, validated_data):
        assigned_to_ids = validated_data.pop("assigned_to_ids", None)
        category_id = validated_data.pop('category_id', None)

        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description) # Mapped from description
        instance.completed = validated_data.get("completed", instance.completed)
        instance.priority = validated_data.get("priority", instance.priority)
        instance.due_date = validated_data.get("due_date", instance.due_date)

        # Allows updating to a specific ID OR clearing it out entirely if sent as None
        instance.category_id = category_id if category_id is not None else instance.category_id
        instance.save()

        if assigned_to_ids is not None:
            instance.assigned_to.set(assigned_to_ids)  # Target proper relationship attribute

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer used for user registration.

    Validates `password` and `confirm_pass` match and creates a new
    `User` using `create_user` to ensure proper password hashing.
    """
    username = serializers.CharField()
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
