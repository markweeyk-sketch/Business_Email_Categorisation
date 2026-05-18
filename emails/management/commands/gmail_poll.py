import hashlib

from django.core.management.base import BaseCommand
from django.utils import timezone

from emails.models import Email
from classifier.service import ClassifierService
from routing.service import RoutingService
from ingestion.gmail_service import get_gmail_service, parse_gmail_message


class Command(BaseCommand):
    help = 'Poll Gmail for unread emails, classify and route each one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max',
            type=int,
            default=10,
            dest='max_results',
            help='Maximum number of unread emails to fetch (default: 10)',
        )

    def handle(self, *args, **options):
        max_results = options['max_results']

        self.stdout.write(f'Connecting to Gmail...')
        service = get_gmail_service()

        result = service.users().messages().list(
            userId='me',
            labelIds=['INBOX', 'UNREAD'],
            maxResults=max_results,
        ).execute()

        messages = result.get('messages', [])

        if not messages:
            self.stdout.write('No unread emails found.')
            return

        self.stdout.write(f'Found {len(messages)} unread email(s). Processing...\n')

        classifier = ClassifierService()
        router = RoutingService()
        processed = 0
        skipped = 0

        for msg in messages:
            msg_id = msg['id']

            if Email.objects.filter(message_id=msg_id).exists():
                skipped += 1
                continue

            try:
                parsed = parse_gmail_message(service, msg_id)
            except Exception as e:
                self.stderr.write(f'Error parsing {msg_id}: {e}')
                continue

            body_hash = hashlib.sha256(parsed['body'].encode()).hexdigest()

            email = Email.objects.create(
                message_id=parsed['message_id'],
                sender=parsed['sender'],
                subject=parsed['subject'],
                received_at=parsed['received_at'],
                raw_body_hash=body_hash,
            )

            classification = classifier.classify(email)
            routing = router.route(email, classification)

            self.stdout.write(
                f"\nFrom:       {email.sender}\n"
                f"Subject:    {email.subject}\n"
                f"Category:   {classification.category}\n"
                f"Confidence: {classification.confidence:.0%}\n"
                f"Method:     {classification.method}\n"
                f"Routed to:  {routing.routed_to}\n"
                f"Status:     {routing.status}\n"
                f"Review:     {classification.requires_review}\n"
                f"Reason:     {classification.reason}\n"
                f"{'=' * 50}"
            )
            processed += 1

        summary = f'\n{processed} processed'
        if skipped:
            summary += f', {skipped} skipped (already in database)'
        self.stdout.write(self.style.SUCCESS(summary))
