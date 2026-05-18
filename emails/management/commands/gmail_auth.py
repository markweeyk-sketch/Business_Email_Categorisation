from django.core.management.base import BaseCommand
from ingestion.gmail_service import get_gmail_service


class Command(BaseCommand):
    help = 'Authorise Gmail access via OAuth and verify the connection'

    def handle(self, *args, **options):
        self.stdout.write('Opening browser for Gmail authorisation...')

        service = get_gmail_service()
        profile = service.users().getProfile(userId='me').execute()

        self.stdout.write(self.style.SUCCESS(
            f'\nAuthorised: {profile["emailAddress"]}\n'
            f'Token saved to gmail_token.json'
        ))
