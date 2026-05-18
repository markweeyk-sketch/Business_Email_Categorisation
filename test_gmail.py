from gmail_auth import get_gmail_service

service = get_gmail_service()

results = service.users().messages().list(
    userId='me',
    labelIds=['INBOX'],
    q='is:unread',
    maxResults=1
).execute()

messages = results.get('messages', [])

if messages:
    msg = service.users().messages().get(
        userId='me',
        id=messages[0]['id'],
        format='full'
    ).execute()

    headers = {h['name']: h['value'] for h in msg['payload']['headers']}
    print("✅ Gmail connected successfully!")
    print(f"   From:    {headers.get('From')}")
    print(f"   Subject: {headers.get('Subject')}")
    print(f"   Date:    {headers.get('Date')}")
else:
    print("✅ Gmail connected — but no unread emails in inbox")