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
from .serializers import BookSerializer, TaskSerializer, PublicProfileSerializer,PrivateProfileSerializer, RegisterSerializer, CategorySerializer
from .throttle import CreateBookThrottle, SearchBooksThrottle

_openlibrary_session = requests.Session()
OPENLIBRARY_CACHE_TTL = 60 * 10

# Caps how many local results search_books returns, so a broad query
# (e.g. a common word matching many rows) can't return an unbounded payload.
SEARCH_LOCAL_RESULT_LIMIT = 30


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
        if self.action in ("create", "import_book"):
            return [CreateBookThrottle()]
        if self.action in ("search_books", "lookup_source_book"):
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
                'cover_url': f"https://covers.openlibrary.org/b/isbn/{book.isbn}-M.jpg" if book.isbn else None,
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
                'cover_url': f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-M.jpg" if doc.get('cover_i') else None,
                'source_type': "openlibrary",
                'source_id': src_id,
                "is_already_cached": False
            })
            if src_id:
                seen_source_ids.add(src_id)

        return Response(result_list, status=status.HTTP_200_OK)

    def _get_open_library_work(self, source_id: str) -> dict | None:
        """Fetch (with caching) an Open Library work's title/author/
        description/cover/subjects. Returns None if Open Library has
        nothing for this key.

        Caches only the raw external data — never anything derived from
        local DB state or the current request — so this cache entry
        stays valid regardless of who imports the book later, and
        regardless of which endpoint (lookup or import) populated it.
        """
        cache_key = f'openlibrary_work:{source_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            work_res = _openlibrary_session.get(f"https://openlibrary.org{source_id}.json", timeout=5)
            if work_res.status_code != 200:
                return None
            work = work_res.json()
        except requests.exceptions.RequestException:
            return None

        description = work.get('description')
        if isinstance(description, dict):
            description = description.get('value', '')
        elif not isinstance(description, str):
            description = ''

        # Work-level JSON only gives an author key, not a name — one extra
        # lookup for the first listed author. Failure here just falls
        # back to "Unknown Author" rather than failing the whole request.
        author_name = 'Unknown Author'
        author_entries = work.get('authors') or []
        if author_entries:
            author_key = author_entries[0].get('author', {}).get('key')
            if author_key:
                try:
                    author_res = _openlibrary_session.get(f"https://openlibrary.org{author_key}.json", timeout=5)
                    if author_res.status_code == 200:
                        author_name = author_res.json().get('name', author_name)
                except requests.exceptions.RequestException:
                    pass

        covers = work.get('covers') or []
        cover_url = f"https://covers.openlibrary.org/b/id/{covers[0]}-L.jpg" if covers else None

        result = {
            'source_id': source_id,
            'source_type': 'openlibrary',
            'title': work.get('title', 'Untitled book'),
            'author': author_name,
            'description': description or "No description available from Open Library.",
            'cover_url': cover_url,
            'subjects': (work.get('subjects') or [])[:8],
        }
        cache.set(cache_key, result, OPENLIBRARY_CACHE_TTL)
        return result

    @action(detail=False, methods=['get'], url_path='lookup', permission_classes=[AllowAny])
    def lookup_source_book(self, request):
        """
        URL: GET /api/books/lookup/?source_id=/works/OL27479W
        EFFECT: Proxies and caches an Open Library work lookup so the full
        book detail page (title, description, cover) can be read on this
        site, instead of sending the reader to openlibrary.org for it.
        Only supports Open Library work keys today (/works/OL...W), which
        is what search_books returns as source_id for openlibrary results.
        """
        source_id = request.query_params.get('source_id')
        if not source_id or not source_id.startswith('/works/'):
            return Response(
                {"error": "A valid Open Library work source_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = self._get_open_library_work(source_id)
        if result is None:
            return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

        # is_already_cached means "does a Books row exist for this
        # source_id" — same meaning as everywhere else in the app (never
        # "did the response cache have an entry" — that's an unrelated
        # perf detail and must not leak into this field).
        is_saved_locally = Books.objects.filter(source_id=source_id).exists()
        return Response({**result, 'is_already_cached': is_saved_locally}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import', permission_classes=[IsAuthenticated])
    def import_book(self, request):
        """
        URL: POST /api/books/import/
        Body: { source_id, isbn? }
        EFFECT: Saves a verified Open Library result into the local
        library, owned by the requesting user. Title/author/description
        are always re-derived server-side from cache or a fresh Open
        Library lookup — never trusted from the request body — so a
        client can't claim arbitrary book data under a real source_id.
        isbn is the one exception: Open Library's work-level JSON has no
        ISBN field at all, so there's no server-side value to verify
        against; the model's isbn_validator still rejects non-ISBN-shaped
        input.
        """
        source_id = request.data.get('source_id')
        if not source_id:
            return Response({"error": "source_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not source_id.startswith('/works/'):
            return Response({"error": "Invalid source_id formatting."}, status=status.HTTP_400_BAD_REQUEST)

        existing = Books.objects.filter(source_id=source_id).first()
        if existing:
            # Already imported by someone — hand back the existing record
            # rather than erroring on the unique constraint.
            serializer = self.get_serializer(existing, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        book_data = self._get_open_library_work(source_id)
        if book_data is None:
            return Response(
                {"error": "Could not verify this book with Open Library."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        serializer = self.get_serializer(data={
            'title': book_data.get('title', 'Untitled book'),
            'author': book_data.get('author', 'Unknown Author'),
            'description': book_data.get('description', ''),
            'isbn': request.data.get('isbn') or None,
            'source_type': 'openlibrary',
            'source_id': source_id,
        }, context={'request': request})

        serializer.is_valid(raise_exception=True)
        serializer.save(posted_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
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
    """Manage user profiles.

    List/retrieve return PublicProfileSerializer (no PII) for anyone,
    or PrivateProfileSerializer (includes email/phone_no) when the
    requester is viewing their own profile. Writes require ownership.
    """
    queryset = UserProfile.objects.select_related('user').all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    lookup_field = 'uuid'

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            user = self.request.user
            if self.action == 'retrieve':
                # Object-level check happens after get_object(), so this
                # only applies to the single-object case; list always
                # uses the public serializer per-row (see get_serializer_context
                # note below if per-row switching is ever needed there).
                obj = self.get_object()
                if user.is_authenticated and obj.user_id == user.pk:
                    return PrivateProfileSerializer
            return PublicProfileSerializer
        return PrivateProfileSerializer  # create/update/destroy — always the owner

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)