# from channels.layers import get_channel_layer
# from asgiref.sync import async_to_sync
from django.core.mail import send_mail
from django.conf import settings

def send_websocket_notification(user_id, notification):
    """Send real-time notification via WebSocket."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_id}',
            {
                'type': 'send_notification',
                'data': notification
            }
        )
    except ImportError:
        # Channels not installed, skip WebSocket notification
        pass

def send_email_notification(subject, message, recipient_list):
    """Send email notification."""
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list,
        fail_silently=True,
    )

def create_notification(user, title, message, notification_type='info'):
    """Create and send notification."""
    from apps.notifications.models import Notification

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type
    )

    send_websocket_notification(user.id, {
        'id': notification.id,
        'title': title,
        'message': message,
        'type': notification_type
    })

    return notification
        'message': message,
        'type': notification_type
    })
    
    return notification