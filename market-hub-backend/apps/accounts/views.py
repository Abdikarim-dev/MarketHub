"""Views for authentication and user profile."""
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


@extend_schema(tags=["Auth"])
class RegisterView(generics.CreateAPIView):
    """Register a new customer or seller account."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Auth"])
class LoginView(TokenObtainPairView):
    """Obtain a JWT access/refresh token pair and the user profile."""

    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema(tags=["Auth"])
class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
