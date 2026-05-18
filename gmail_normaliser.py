import base64
import re
from datetime import datetime

def extract_headers(raw_email: dict) -> dict:
    """Convert Gmail's header list into a simple dictionary"""
    headers = {}
    for header in raw_email['payload']['headers']:
        headers[header['name']] = header['value']
    return headers

def extract_body(raw_email: dict) -> str:
    """
    Extract plain text body from Gmail email.
    Handles three structures Gmail can return:
    1. Simple email  - body is directly in payload.body.data
    2. Multipart     - body is in payload.parts[0].body.data  ← your emails
    3. Nested        - parts within parts (rare, handled below)
    """
    payload = raw_email.get('payload', {})

    # Structure 1: Simple email - body directly in payload
    if payload.get('body', {}).get('data'):
        return _decode_base64(payload['body']['data'])

    # Structure 2: Multipart - find the text/plain part
    parts = payload.get('parts', [])
    for part in parts:
        if part.get('mimeType') == 'text/plain':
            data = part.get('body', {}).get('data', '')
            if data:
                return _decode_base64(data)

    # Structure 3: Nested multipart (fallback)
    for part in parts:
        nested_parts = part.get('parts', [])
        for nested in nested_parts:
            if nested.get('mimeType') == 'text/plain':
                data = nested.get('body', {}).get('data', '')
                if data:
                    return _decode_base64(data)

      
      # Last resort — strip HTML tags from HTML part
    for part in parts:
        if part.get('mimeType') == 'text/html':
            data = part.get('body', {}).get('data', '')
            if data:
                html = _decode_base64(data)
                text = re.sub(r'<[^>]+>', ' ', html)
                return text
                
    # Last resort — use the snippet Gmail provides
    return raw_email.get('snippet', '')

def _decode_base64(data: str) -> str:
    """Decode Gmail's URL-safe base64 encoded content"""
    try:
        decoded = base64.urlsafe_b64decode(data + '==')
        return decoded.decode('utf-8', errors='replace')
    except Exception:
        return ''

def clean_body(text: str, max_chars: int = 500) -> str:
    """
    Strip noise from email body before sending to AI.
    Removes URLs, extra whitespace, truncates to max_chars.
    """
    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    # Remove excessive whitespace/newlines
    text = re.sub(r'\s+', ' ', text).strip()
    # Truncate
    return text[:max_chars]

def normalise_email(raw_email: dict) -> dict:
    """
    Convert raw Gmail API response into a clean standard format.
    This is the only function you'll call from outside this file.
    """
    headers = extract_headers(raw_email)
    raw_body = extract_body(raw_email)

    return {
        "id":           raw_email.get('id'),
        "source":       "gmail",
        "sender":       headers.get('From', 'Unknown'),
        "subject":      headers.get('Subject', '(No Subject)'),
        "timestamp":    headers.get('Date', ''),
        "labels":       raw_email.get('labelIds', []),
        "snippet":      raw_email.get('snippet', ''),
        "body_clean":   clean_body(raw_body),  # what gets sent to AI
        "body_raw":     raw_body,              # stored in DB
        "status":       "pending_categorisation"
    }