from django.core.management.base import BaseCommand
from django.utils import timezone
from emails.models import Email
from classifier.service import ClassifierService
from routing.service import RoutingService


class Command(BaseCommand):
    help = 'Test the classifier and router with sample emails'

    def handle(self, *args, **options):
        test_emails = [
            {'sender': 'unknown@domain.biz', 'subject': 'Re: Invoice 8821'},
            {'sender': 'it@company.com', 'subject': 'Error Code 504 During Tax Filing'},
            {'sender': 'newsletter@mailchimp.com', 'subject': 'Your weekly digest'},
            {'sender': 'ausharanne@gmail.com', 'subject': 'Invitation to Local Business Networking Event'},
        ]

        classifier = ClassifierService()
        router = RoutingService()

        for data in test_emails:
            message_id = f"test-{data['subject'][:20]}@test.com"
            Email.objects.filter(message_id=message_id).delete()

            email = Email.objects.create(
                message_id=message_id,
                sender=data['sender'],
                subject=data['subject'],
                received_at=timezone.now(),
                raw_body_hash='test-hash'
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
                f"{'='*50}"
            )

        self.stdout.write("\nAll emails processed successfully.")