import hmac
import json
import hashlib
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from emails.models import Email
from classifier.service import ClassifierService
from routing.service import RoutingService


@csrf_exempt
@require_POST
def ingest_email(request):
    # Shared-secret auth — this endpoint is not token-authenticated because
    # it is called by the Gmail webhook, not by dashboard users.
    secret = settings.GMAIL_WEBHOOK_SECRET
    if secret:
        provided = request.headers.get('X-Webhook-Secret', '')
        if not hmac.compare_digest(provided, secret):
            return JsonResponse({'error': 'Invalid webhook secret'}, status=401)

    try:
        data = json.loads(request.body)

        # extract fields
        message_id = data.get('message_id')
        sender = data.get('sender')
        subject = data.get('subject', '(no subject)')
        body = data.get('body', '')
        received_at = parse_datetime(data.get('received_at', '')) or timezone.now()

        # validate required fields
        if not message_id or not sender:
            return JsonResponse({'error': 'message_id and sender are required'}, status=400)

        # skip duplicates
        if Email.objects.filter(message_id=message_id).exists():
            return JsonResponse({'status': 'duplicate', 'message_id': message_id}, status=200)

        # hash the body for privacy — never store raw content
        body_hash = hashlib.sha256(body.encode()).hexdigest()

        # create email record
        email = Email.objects.create(
            message_id=message_id,
            sender=sender,
            subject=subject,
            received_at=received_at,
            raw_body_hash=body_hash
        )

        # classify and route
        classification = ClassifierService().classify(email)
        routing = RoutingService().route(email, classification)

        return JsonResponse({
            'status': 'processed',
            'email_id': str(email.id),
            'category': classification.category,
            'confidence': classification.confidence,
            'routed_to': routing.routed_to,
            'requires_review': classification.requires_review
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
