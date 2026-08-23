# viewsets.py
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, mixins, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.response import Response
import requests

from .filters import BookFilter, TaskFilter
from .models import Books, TaskModel, UserProfile, Category
from .permissions import IsOwnerOrReadOnly
from .serializers import BookSerializer, TaskSerializer, ProfileSerializer, RegisterSerializer, CategorySerializer
from .throttle import CreateBookThrottle, SearchBooksThrottle

_openlibrary_session = requests.Session()
OPENLIBRARY_CACHE_TTL = 60 * 10

# Caps how many local results search_books returns, so a broad query
# (e.g. a common word matching many rows) can't return an unbounded payload.
SEARCH_LOCAL_RESULT_LIMIT = 20


class CategoryViewSet(viewsets.ModelViewSet):
    """Allows users to manage task categories and themes.

    Categories are a shared, unowned resource (no posted_by/user field) —
    any authenticated user may create, edit, or delete a category.
    IsOwnerOrReadOnly is deliberately NOT used here: since Category has no
    owner attribute, its has_object_permission() would deny ALL writes to
    ALL users once a category exists. If categories should be staff-only,
    swap in a staff-write permission instead.

    task_count is annotated in the queryset (single query for the whole
    list) rather than computed per-object in the serializer, to avoid N+1
    .count() queries.
    """
    queryset = Category.objects.annotate(task_count_annotated=Count('taskmodel'))
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class BookViewSet(viewsets.ModelViewSet):
    """CRUD for `Books` with search, filtering and owner-based permissions."""
    # select_related('posted_by') avoids an N+1 query for owner_username
    # in list responses (one extra query per book without it).
    queryset = Books.objects.select_related('posted_by').all()
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
        if self.action == "search_books":
            return [SearchBooksThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['get'], url_path='search', permission_classes=[AllowAny])
    def search_books(self, request):
        """
        URL: GET /api/books/search/?q=dracula
        EFFECT: Checks local DB matches, aggregates external OpenLibrary
        results (cached), and returns a combined, deduplicated list.
        """
        search_query = request.query_params.get('q')
        if not search_query:
            return Response({"error": "please search for something"}, status=status.HTTP_400_BAD_REQUEST)

        local_db = Books.objects.filter(
            Q(title__icontains=search_query) | Q(author__icontains=search_query) | Q(description__icontains=search_query)
        ).only(
            'uuid', 'title', 'author', 'description', 'isbn', 'source_type', 'source_id'
        )[:SEARCH_LOCAL_RESULT_LIMIT]

        result_list = []
        seen_source_ids = set()

        for book in local_db:
            result_list.append({
                'id': str(book.uuid),
                'title': book.title,
                'author': book.author,
                'description': book.description,
                'isbn': book.isbn,
                'source_type': book.source_type,
                'source_id': book.source_id,
                'is_already_cached': True
            })
            if book.source_id:
                seen_source_ids.add(book.source_id)

        normal_query = search_query.strip().lower()
        cached_key = f'openlibrary_search:{normal_query}'
        docs = cache.get(cached_key)

        if docs is None:
            docs = []
            try:
                api_res = _openlibrary_session.get(
                    "https://openlibrary.org/search.json",
                    params={"q": search_query, "limit": 20},
                    timeout=5,
                )
                if api_res.status_code == 200:
                    docs = api_res.json().get('docs', [])
                    cache.set(cached_key, docs, OPENLIBRARY_CACHE_TTL)
            except requests.exceptions.RequestException:
                pass

        for doc in docs:
            src_id = doc.get("key")
            if src_id and src_id in seen_source_ids:
                continue

            isbns = doc.get('isbn')
            primary_isbn = isbns[0] if isbns else None

            author_list = doc.get('author_name') or ['Unknown Author']

            result_list.append({
                'id': None,
                'title': doc.get('title', "Unknown Title"),
                'author': ", ".join(author_list),
                'description': "Available to import from global network",
                'isbn': primary_isbn,
                'source_type': "openlibrary",
                'source_id': src_id,
                "is_already_cached": False
            })
            if src_id:
                seen_source_ids.add(src_id)

        return Response(result_list, status=status.HTTP_200_OK)


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
    queryset = UserProfile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    permission_classes = [IsOwnerOrReadOnly]
    lookup_field = 'uuid'

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)