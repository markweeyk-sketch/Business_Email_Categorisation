import base64
import re
from email.utils import parsedate_to_datetime

from django.conf import settings
from django.utils import timezone
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
]

_CREDENTIALS_FILE = str(settings.BASE_DIR / 'gmail_credentials.json')
_TOKEN_FILE = str(settings.BASE_DIR / 'gmail_token.json')


def get_gmail_service():
    creds = None

    try:
        creds = Credentials.from_authorized_user_file(_TOKEN_FILE, SCOPES)
    except FileNotFoundError:
        pass

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(_CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(_TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)


def parse_gmail_message(service, message_id: str) -> dict:
    raw = service.users().messages().get(
        userId='me',
        id=message_id,
        format='full',
    ).execute()

    headers = {h['name']: h['value'] for h in raw['payload']['headers']}

    sender = _extract_email(headers.get('From', ''))
    subject = headers.get('Subject', '(no subject)')
    received_at = _parse_date(headers.get('Date', ''))
    body = _extract_body(raw)[:500]

    return {
        'message_id': message_id,
        'sender': sender,
        'subject': subject,
        'body': body,
        'received_at': received_at,
    }


# ── internals ──────────────────────────────────────────────────────────────────

def _extract_email(from_header: str) -> str:
    match = re.search(r'<([^>]+)>', from_header)
    return match.group(1).strip() if match else from_header.strip()


def _parse_date(date_str: str):
    try:
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            return timezone.make_aware(dt)
        return dt
    except Exception:
        return timezone.now()


def _extract_body(raw_email: dict) -> str:
    payload = raw_email.get('payload', {})

    # Structure 1: simple email
    if payload.get('body', {}).get('data'):
        return _decode(payload['body']['data'])

    parts = payload.get('parts', [])

    # Structure 2: multipart — find text/plain
    for part in parts:
        if part.get('mimeType') == 'text/plain':
            data = part.get('body', {}).get('data', '')
            if data:
                return _decode(data)

    # Structure 3: nested multipart
    for part in parts:
        for nested in part.get('parts', []):
            if nested.get('mimeType') == 'text/plain':
                data = nested.get('body', {}).get('data', '')
                if data:
                    return _decode(data)

    # Fallback: strip HTML
    for part in parts:
        if part.get('mimeType') == 'text/html':
            data = part.get('body', {}).get('data', '')
            if data:
                return re.sub(r'<[^>]+>', ' ', _decode(data))

    return raw_email.get('snippet', '')


def _decode(data: str) -> str:
    try:
        return base64.urlsafe_b64decode(data + '==').decode('utf-8', errors='replace')
    except Exception:
        return ''
