"""ViewSets exposing API endpoints for books, tasks, profiles and categories.

Each ViewSet wires serializers, querysets and permission rules for the
corresponding resource.
"""

from rest_framework import viewsets, mixins, filters  
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

from .permissions import IsOwnerOrReadOnly
from .models import Books, TaskModel, UserProfile, Category  # 🚀 Fixed: Added Category
from .serializers import BookSerializer, TaskSerializer, ProfileSerializer, RegisterSerializer, CategorySerializer
from .throttle import CreateBookThrottle
from .filters import BookFilter, TaskFilter


class CategoryViewSet(viewsets.ModelViewSet):
    """
    Allows users to manage task categories and themes.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class BookViewSet(viewsets.ModelViewSet):
    """CRUD for `Books` with search, filtering and owner-based permissions.

    Uses `CreateBookThrottle` for create actions to limit abuse.
    """
    queryset = Books.objects.all()
    serializer_class = BookSerializer
    lookup_field = 'uuid'  
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BookFilter
    search_fields = ["title", "author", "description"] 
    ordering_fields = ["title", "author", "published_date", "created_at"]
    ordering = ["-created_at"]
    
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(posted_by=self.request.user)

    def get_throttles(self):
        if self.action == "create":
            return [CreateBookThrottle()]
        return super().get_throttles()


class TaskViewSet(viewsets.ModelViewSet):
    """Endpoints for task management scoped to the authenticated user."""
    queryset = TaskModel.objects.all()
    serializer_class = TaskSerializer
    lookup_field = 'uuid'  
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = ['completed', 'priority', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'completed', "created_at", 'priority', 'due_date']
    ordering = ['-created_at']
    
    def get_queryset(self):
        
        
        queryset = TaskModel.objects.select_related('user', 'category').prefetch_related("assigned_to").filter(user=self.request.user)
        
        
        overdue_param = self.request.query_params.get('overdue', '').lower()
        if overdue_param in ['true', '1']:
            from django.utils import timezone 
            queryset = queryset.filter(due_date__lt=timezone.now(), completed=False)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RegisterViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    """Manage user profiles. Write operations require ownership."""
    queryset = UserProfile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsOwnerOrReadOnly]
    lookup_field = 'uuid'
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
