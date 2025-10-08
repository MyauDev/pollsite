from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db.models.functions import Lower


class Command(BaseCommand):
    """
    Create or update a user and grant/revoke moderator (is_staff) or superuser privileges.

    Examples:
      python manage.py create_moderator alice --email alice@example.com --password "StrongPass123"
      python manage.py create_moderator --by-email alice@example.com --superuser
      python manage.py create_moderator alice --demote
      python manage.py create_moderator alice --email new@example.com  # will update email
    """
    help = "Create or promote a user to moderator (is_staff=True) or superuser; can demote as well."

    def add_arguments(self, parser):
        parser.add_argument('username', nargs='?', help='Username to create/promote (optional if --by-email)')
        parser.add_argument('--email', default='', help='Email for create/update (optional)')
        parser.add_argument('--by-email', default='', help='Find existing user by email (case-insensitive)')
        parser.add_argument('--password', default='', help='Set/reset password')
        parser.add_argument('--superuser', action='store_true', help='Grant superuser status too')
        parser.add_argument('--demote', action='store_true', help='Revoke is_staff/is_superuser')
        parser.add_argument('--only-existing', action='store_true', help='Fail if user not found (no create)')

    def handle(self, *args, **opts):
        User = get_user_model()
        username = (opts.get('username') or '').strip()
        by_email = (opts.get('by_email') or '').strip()
        email = (opts.get('email') or '').strip().lower()
        password = opts.get('password') or ''
        make_super = bool(opts.get('superuser'))
        demote = bool(opts.get('demote'))
        only_existing = bool(opts.get('only_existing'))

        if not username and not by_email:
            raise CommandError("Provide either <username> or --by-email <email>")

        # 1) resolve existing by username / by_email
        user_by_un = None
        user_by_mail = None

        if username:
            try:
                user_by_un = User.objects.get(**{User.USERNAME_FIELD: username})
            except User.DoesNotExist:
                user_by_un = None

        if by_email:
            try:
                user_by_mail = User.objects.get(email__iexact=by_email)
            except User.DoesNotExist:
                user_by_mail = None

        # if both provided and both exist but are different users => conflict
        if user_by_un and user_by_mail and user_by_un.pk != user_by_mail.pk:
            raise CommandError(
                f"Conflict: username '{username}' refers to a different user than email '{by_email}'."
            )

        # pick the resolved or create
        user = user_by_un or user_by_mail

        if not user:
            if only_existing:
                ident = by_email or username
                raise CommandError(f"User {ident} does not exist (only-existing).")
            # create new: prefer provided username; if нет — берём локальную часть email
            if not username:
                if not (email or by_email):
                    raise CommandError("Cannot create user: need username or email.")
                username = (email or by_email).split('@')[0]
            user = User.objects.create(**{User.USERNAME_FIELD: username}, email=(email or by_email).lower())
            self.stdout.write(self.style.WARNING(f"Created user {username} (email={email or by_email or '—'})"))

        # 2) update email if passed and differs (and не занят другим)
        if email and (user.email or '').lower() != email:
            # check uniqueness by case-insensitive comparison, if your model enforces unique email
            if hasattr(User, 'email'):
                clash = User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists()
                if clash:
                    raise CommandError(f"Email '{email}' is already used by another user.")
            user.email = email
            user.save(update_fields=['email'])
            self.stdout.write(self.style.SUCCESS(f"Email updated to {email} for {user.get_username()}"))

        # 3) set/reset password
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
            self.stdout.write(self.style.SUCCESS(f"Password set for {user.get_username()}"))

        # 4) privileges
        if demote:
            updates = []
            if user.is_staff:
                user.is_staff = False; updates.append('is_staff')
            if user.is_superuser:
                user.is_superuser = False; updates.append('is_superuser')
            if updates:
                user.save(update_fields=updates)
                self.stdout.write(self.style.SUCCESS(
                    f"Demoted {user.get_username()} (is_staff={user.is_staff}, is_superuser={user.is_superuser})"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"No changes; {user.get_username()} already has no moderator/superuser privileges."
                ))
            return

        updates = []
        if not user.is_staff:
            user.is_staff = True; updates.append('is_staff')
        if make_super and not user.is_superuser:
            user.is_superuser = True; updates.append('is_superuser')
        if updates:
            user.save(update_fields=updates)
            self.stdout.write(self.style.SUCCESS(
                f"Updated {user.get_username()} (is_staff={user.is_staff}, is_superuser={user.is_superuser})"
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"No changes; {user.get_username()} already has requested privileges."
            ))
