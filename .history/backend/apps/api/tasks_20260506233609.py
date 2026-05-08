"""
Celery tasks for the CFCT church management system.

These tasks run asynchronously via a Celery worker.  When
CELERY_TASK_ALWAYS_EAGER=True (useful in tests / local dev without Redis)
they execute synchronously in the calling thread instead.
"""
from __future__ import annotations

from datetime import timedelta
import logging

try:
    from celery import shared_task
except ImportError:  # pragma: no cover - local/dev fallback when Celery isn't installed
    def shared_task(*_args, **_kwargs):
        def decorator(func):
            return func
        return decorator
from django.conf import settings
from django.contrib.admin.models import LogEntry
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Email helpers
# ---------------------------------------------------------------------------

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, subject: str, message: str, recipient_list: list[str],
                    html_message: str | None = None) -> None:
    """Generic fire-and-forget email task with automatic retry on failure."""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception("send_email_task failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, user_id: int, reset_url: str) -> None:
    """Send a password-reset email to the user."""
    from apps.accounts.models import User  # local import to avoid circular deps

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning("send_password_reset_email_task: user %s not found", user_id)
        return

    subject = "Reset your CFCT password"
    plain = (
        f"Hello {user.get_full_name()},\n\n"
        f"Click the link below to reset your password (valid for 1 hour):\n{reset_url}\n\n"
        "If you did not request a password reset, please ignore this email."
    )
    html = (
        f"<p>Hello <strong>{user.get_full_name()}</strong>,</p>"
        f"<p>Click the button below to reset your password (valid for 1 hour):</p>"
        f"<p><a href='{reset_url}' style='background:#2563eb;color:#fff;padding:10px 20px;"
        f"border-radius:6px;text-decoration:none;'>Reset Password</a></p>"
        "<p>If you did not request a password reset, please ignore this email.</p>"
    )
    try:
        send_mail(
            subject=subject,
            message=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception("send_password_reset_email_task failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email_task(self, user_id: int, verify_url: str) -> None:
    """Send an email-verification link to a newly-registered user."""
    from apps.accounts.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning("send_verification_email_task: user %s not found", user_id)
        return

    subject = "Verify your CFCT account email"
    plain = (
        f"Hello {user.get_full_name()},\n\n"
        f"Please verify your email address by clicking the link below:\n{verify_url}\n\n"
        "This link expires in 24 hours."
    )
    html = (
        f"<p>Hello <strong>{user.get_full_name()}</strong>,</p>"
        "<p>Please verify your email address by clicking the button below:</p>"
        f"<p><a href='{verify_url}' style='background:#16a34a;color:#fff;padding:10px 20px;"
        f"border-radius:6px;text-decoration:none;'>Verify Email</a></p>"
        "<p>This link expires in 24 hours.</p>"
    )
    try:
        send_mail(
            subject=subject,
            message=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception("send_verification_email_task failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def send_notification_email_task(self, user_id: int, title: str, message: str) -> None:
    """Send a notification email for important system events."""
    from apps.accounts.models import User

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    if not user.email:
        return

    try:
        send_mail(
            subject=f"CFCT Notification: {title}",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception("send_notification_email_task failed: %s", exc)
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Maintenance tasks
# ---------------------------------------------------------------------------

@shared_task
def cleanup_expired_tokens() -> dict:
    """Purge expired SimpleJWT blacklisted tokens (runs daily via Celery Beat)."""
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        deleted_outstanding, _ = OutstandingToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        return {"deleted_outstanding": deleted_outstanding}
    except Exception as exc:
        logger.exception("cleanup_expired_tokens failed: %s", exc)
        return {"error": str(exc)}


@shared_task
def cleanup_audit_logs(retention_days: int | None = None) -> dict:
    """Delete admin audit logs older than configured retention days."""
    try:
        days = retention_days
        if days is None:
            days = int(getattr(settings, 'AUDIT_LOG_RETENTION_DAYS', 365))

        if days < 1:
            return {"error": "AUDIT_LOG_RETENTION_DAYS must be at least 1."}

        cutoff = timezone.now() - timedelta(days=days)
        deleted_count, _ = LogEntry.objects.filter(action_time__lt=cutoff).delete()
        remaining_count = LogEntry.objects.count()

        return {
            "retention_days": days,
            "cutoff": cutoff.isoformat(),
            "deleted_count": deleted_count,
            "remaining_count": remaining_count,
        }
    except Exception as exc:
        logger.exception("cleanup_audit_logs failed: %s", exc)
        return {"error": str(exc)}
