# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import viewsets

router = DefaultRouter()

router.register(r'books', viewsets.BookViewSet, basename="books")
router.register(r'tasks', viewsets.TaskViewSet, basename="tasks") 
router.register(r'profiles', viewsets.ProfileViewSet, basename='profiles')
router.register(r'register', viewsets.RegisterViewSet, basename='signup') 
router.register(r'categories', viewsets.CategoryViewSet, basename='categories')

urlpatterns = [
    path('', include(router.urls)),
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_view"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh_view"),
]
