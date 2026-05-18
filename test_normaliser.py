from gmail_auth import get_gmail_service
from gmail_normaliser import normalise_email

def test_account(account_name: str):
    print(f"\n{'='*60}")
    print(f"Testing: {account_name} account")
    print(f"{'='*60}")

    service = get_gmail_service(account=account_name)

    results = service.users().messages().list(
        userId='me', labelIds=['INBOX'], maxResults=5
    ).execute()

    for msg_ref in results.get('messages', []):
        raw = service.users().messages().get(
            userId='me', id=msg_ref['id'], format='full'
        ).execute()

        email = normalise_email(raw)

        print(f"\nFrom:    {email['sender']}")
        print(f"Subject: {email['subject']}")
        print(f"Body:    {email['body_clean'][:150]}...")

# Test work inbox
test_account('work')