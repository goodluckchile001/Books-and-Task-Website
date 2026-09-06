# urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import viewsets

router = SimpleRouter()

router.register(r'books', viewsets.BookViewSet, basename="books")
router.register(r'tasks', viewsets.TaskViewSet, basename="tasks")
router.register(r'profiles', viewsets.ProfileViewSet, basename='profiles')
router.register(r'register', viewsets.RegisterViewSet, basename='signup')
router.register(r'categories', viewsets.CategoryViewSet, basename='categories')


from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .service import delete_user  


class AccountDeletionView(APIView):
    """DELETE /api/account/ — a user deletes their own account."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        hard_delete_books = request.query_params.get("hard_delete_books", "").lower() == "true"
        summary = delete_user(request.user, hard_delete_books=hard_delete_books)
        return Response(summary, status=status.HTTP_200_OK)


class AdminUserDeletionView(APIView):
    """DELETE /api/admin/users/<int:user_id>/ — staff deletes any user."""
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id):
        target_user = get_object_or_404(User, pk=user_id)
        hard_delete_books = request.query_params.get("hard_delete_books", "").lower() == "true"
        summary = delete_user(target_user, hard_delete_books=hard_delete_books)
        return Response(summary, status=status.HTTP_200_OK)


urlpatterns = [
    path('', include(router.urls)),
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_view"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh_view"),
    path('account/', AccountDeletionView.as_view(), name='account-delete'),
    path('admin/users/<int:user_id>/', AdminUserDeletionView.as_view(), name='admin-user-delete'),
]