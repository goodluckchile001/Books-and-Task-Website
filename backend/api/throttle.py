from rest_framework.throttling import UserRateThrottle 


class CreateBookThrottle(UserRateThrottle):
    """Throttle limiting book creations to a small rate per user."""
    rate = '5/day'


class SearchBooksThrottle(UserRateThrottle):
    """Throttle for the public book search endpoint.

    search_books is AllowAny and triggers an outbound call to Open
    Library on cache miss, so it needs its own (looser) rate than
    CreateBookThrottle. UserRateThrottle falls back to IP-based
    identification for anonymous requests, so this applies whether or
    not the caller is logged in.
    """
    rate = '30/min'