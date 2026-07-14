"""Business logic for the accounts app."""
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


@transaction.atomic
def register_user(*, username, email, password, first_name="", last_name="", role=None):
    """Create a new user with a hashed password.

    Registration is limited to the CUSTOMER and SELLER roles; admin accounts are
    provisioned via ``createsuperuser`` or by an existing admin.
    """
    role = role or User.Role.CUSTOMER
    if role == User.Role.ADMIN:
        role = User.Role.CUSTOMER  # never allow self-service admin registration

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
    )
    return user
