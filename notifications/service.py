import logging
import requests
from .models import PushDevice

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
CHUNK_SIZE = 100  # Expo push API accepts at most 100 messages per request


def send_push(title, body, data=None):
    """Send a push notification to every active registered device.

    Failures are logged, never raised — a push problem must not break
    email ingestion or classification.
    """
    tokens = list(PushDevice.objects.filter(is_active=True).values_list('token', flat=True))
    if not tokens:
        return

    messages = [{
        'to': token,
        'title': title,
        'body': body,
        'sound': 'default',
        'data': data or {},
    } for token in tokens]

    for start in range(0, len(messages), CHUNK_SIZE):
        chunk = messages[start:start + CHUNK_SIZE]
        try:
            res = requests.post(EXPO_PUSH_URL, json=chunk, timeout=5)
            res.raise_for_status()
            _handle_receipts(chunk, res.json().get('data', []))
        except Exception:
            logger.exception('Expo push send failed')


def _handle_receipts(chunk, tickets):
    """Deactivate tokens Expo reports as no longer registered."""
    for message, ticket in zip(chunk, tickets):
        if ticket.get('status') != 'error':
            continue
        error = (ticket.get('details') or {}).get('error', '')
        if error == 'DeviceNotRegistered':
            PushDevice.objects.filter(token=message['to']).update(is_active=False)
        else:
            logger.warning('Expo push ticket error for %s: %s', message['to'][:30], ticket)


def notify_review_needed(email, classification):
    """Alert mobile devices that a new email needs manual review."""
    send_push(
        title='Email needs review',
        body=f"{email.sender}: {email.subject[:120]}",
        data={'email_id': str(email.id)},
    )
