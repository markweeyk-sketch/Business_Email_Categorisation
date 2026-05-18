from gmail_auth import get_gmail_service
from gmail_normaliser import normalise_email
from categoriser import categorise_email
import json

service = get_gmail_service(account='work')

results = service.users().messages().list(
    userId='me', labelIds=['INBOX'], maxResults=10
).execute()

for msg_ref in results.get('messages', []):
    raw = service.users().messages().get(
        userId='me', id=msg_ref['id'], format='full'
    ).execute()

    email = normalise_email(raw)
    result = categorise_email(email)

    print("=" * 60)
    print(f"From:      {result['sender']}")
    print(f"Subject:   {result['subject']}")
    print(f"Category:  {result['category']}")
    print(f"Confidence:{result['confidence']}")
    print(f"By:        {result['categorised_by']}")
    print(f"Reason:    {result['reason']}")
    print(f"Action:    {result['action']}")
    print(f"Review:    {result['review_needed']}")