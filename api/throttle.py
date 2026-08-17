"""Request throttling configuration for the API."""

from rest_framework.throttling import UserRateThrottle 


class CreateBookThrottle(UserRateThrottle):
    """Throttle limiting book creations to a small rate per user."""
    rate = '5/day'