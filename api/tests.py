from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase

from .models import Books
from .serializers import BookSerializer


class BookSerializerTests(TestCase):
    def test_owner_username_uses_owner_relation(self):
        owner = User.objects.create_user(username='alice', password='testpass')
        book = Books.objects.create(
            posted_by=owner,
            title='Django REST',
            description='Test book',
            author='Jane Doe',
            isbn='1234567890123',
            published_date=date(2024, 1, 1),
        )

        serializer = BookSerializer(book)

        self.assertEqual(serializer.data['owner_username'], 'alice')
