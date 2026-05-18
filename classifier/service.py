import anthropic
import json
import re
from django.conf import settings
from emails.models import Classification

SYSTEM_PROMPT = """You are an email triage assistant for a business inbox.

Classify the email into exactly one of these categories:
- IT Technical: technical issues, software errors, system problems, IT requests
- Marketing: marketing campaigns, partnerships, promotional content
- Tax: tax filings, HMRC, invoices, financial compliance, VAT
- Others: legitimate business emails that don't fit the above
- No Action Required: newsletters, automated notifications, marketing from external companies

Rules:
- If the subject mentions a technical error (e.g. error codes, timeouts, system failures),
  classify as IT Technical even if tax or finance terms also appear.
- Only classify as No Action Required if no human response is needed.
- External invitations, event invites, or networking requests sent to the business
  inbox require a human decision — classify these as Others, not No Action Required.
- If genuinely ambiguous, return low confidence (below 0.65).

Respond with JSON only:
{
  "category": "<category>",
  "confidence": <0.0-1.0>,
  "reason": "<one sentence explanation>",
  "requires_review": <true|false>
}"""


NO_ACTION_SENDERS = [
    'mailchimp.com', 'hubspot.com', 'sendgrid.net', 'constantcontact.com',
    'campaignmonitor.com', 'klaviyo.com', 'marketo.com', 'salesforce.com',
    'noreply.', 'no-reply.', 'donotreply.', 'notifications@', 'alerts@',
    'newsletter@', 'digest@', 'updates@', 'mailer@', 'bounce@',
]

NO_ACTION_SUBJECTS = [
    'unsubscribe', 'newsletter', 'weekly digest', 'daily digest',
    'monthly digest', 'your receipt', 'order confirmation',
    'shipping confirmation', 'delivery confirmation', 'account statement',
    'your statement is ready', 'your bill is ready', 'automatic payment',
    'payment processed', 'transaction confirmation',
]

IT_SUBJECTS = [
    r'error\s*(code)?\s*\d+',
    r'\d{3}\s*error',
    'server down', 'system outage', 'service unavailable',
    'cannot connect', 'connection refused', 'timeout',
    'critical alert', 'disk space', 'cpu usage', 'memory usage',
    'ssl certificate', 'domain expir', 'website down',
    'ticket #', 'support ticket', 'it helpdesk', 'it support',
]

TAX_SENDERS = [
    'hmrc.gov.uk', 'irs.gov', 'iras.gov.sg',
    'tax.gov', 'revenue.', 'customs.gov',
]

TAX_SUBJECTS = [
    'tax return', 'vat return', 'vat filing', 'tax filing',
    'tax assessment', 'notice of assessment', 'tax bill',
    'gst filing', 'gst return', 'corporation tax',
    'self assessment', 'paye', 'tax refund',
]

MARKETING_SUBJECTS = [
    'partnership opportunity', 'collaboration opportunity',
    'advertising opportunity', 'sponsorship opportunity',
    'press release', 'media kit', 'campaign proposal',
    'marketing proposal', 'seo services', 'digital marketing',
    'social media management', 'influencer',
]


def _sender_domain(sender):
    match = re.search(r'@([\w.-]+)', sender.lower())
    return match.group(1) if match else ''


class RulesEngine:

    def classify(self, email):
        sender = email.sender.lower()
        subject = email.subject.lower()
        domain = _sender_domain(sender)

        for pattern in NO_ACTION_SENDERS:
            if pattern in sender:
                return self._result(
                    Classification.Category.NO_ACTION,
                    confidence=0.95,
                    reason=f"Sender pattern '{pattern}' matches automated/marketing sender list."
                )

        for pattern in NO_ACTION_SUBJECTS:
            if pattern in subject:
                return self._result(
                    Classification.Category.NO_ACTION,
                    confidence=0.92,
                    reason=f"Subject matches automated notification pattern: '{pattern}'."
                )

        for pattern in IT_SUBJECTS:
            if re.search(pattern, subject):
                return self._result(
                    Classification.Category.IT_TECHNICAL,
                    confidence=0.93,
                    reason=f"Subject matches IT issue pattern: '{pattern}'."
                )

        for pattern in TAX_SENDERS:
            if pattern in domain:
                return self._result(
                    Classification.Category.TAX,
                    confidence=0.95,
                    reason=f"Sender domain '{domain}' is a known tax authority."
                )

        for pattern in TAX_SUBJECTS:
            if pattern in subject:
                return self._result(
                    Classification.Category.TAX,
                    confidence=0.90,
                    reason=f"Subject matches tax-related pattern: '{pattern}'."
                )

        for pattern in MARKETING_SUBJECTS:
            if pattern in subject:
                return self._result(
                    Classification.Category.MARKETING,
                    confidence=0.88,
                    reason=f"Subject matches marketing pattern: '{pattern}'."
                )

        return None

    def _result(self, category, confidence, reason):
        return {
            'category': category,
            'confidence': confidence,
            'reason': reason,
            'requires_review': False,
            'method': Classification.Method.RULES
        }


class ClassifierService:

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.threshold = settings.CLASSIFIER_CONFIDENCE_THRESHOLD
        self.rules = RulesEngine()

    def classify(self, email):
        result = self.rules.classify(email)

        if result:
            return self._save_classification(email, result)

        try:
            result = self._call_claude(email)
            confidence = result.get('confidence', 0)

            if confidence < self.threshold:
                return self._save_classification(email, {
                    'category': Classification.Category.UNCLASSIFIED,
                    'confidence': confidence,
                    'method': Classification.Method.AI,
                    'reason': f"Confidence {confidence:.0%} below threshold. {result.get('reason', '')}",
                    'requires_review': True
                })

            result['method'] = Classification.Method.AI
            return self._save_classification(email, result)

        except Exception as e:
            return self._save_classification(email, {
                'category': Classification.Category.UNCLASSIFIED,
                'confidence': 0.0,
                'method': Classification.Method.AI,
                'reason': f"Classifier error: {str(e)}",
                'requires_review': True
            })

    def _call_claude(self, email):
        message = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=256,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"From: {email.sender}\nSubject: {email.subject}"
            }]
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())

    def _save_classification(self, email, result):
        email.classifications.filter(is_active=True).update(is_active=False)
        return Classification.objects.create(
            email=email,
            category=result['category'],
            confidence=result['confidence'],
            method=result.get('method', Classification.Method.AI),
            reason=result['reason'],
            requires_review=result.get('requires_review', False),
            is_active=True
        )