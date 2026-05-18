import json
import re
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────
# LAYER 1 — Rules Engine
# ─────────────────────────────────────────

# Known no-action sender domains
NO_ACTION_DOMAINS = [
    'fresha.com', 'epicgames.com', 'linkedin.com',
    'twitter.com', 'facebook.com', 'instagram.com',
    'mailchimp.com', 'sendgrid.net', 'constantcontact.com',
    'hubspot.com', 'salesforce.com', 'noreply.com'
]

# Keywords that signal each category
CATEGORY_KEYWORDS = {
    'Tax': [
        'iras', 'gst', 'tax', 'invoice', 'payment due',
        'filing', 'payroll', 'cpf', 'withholding', 'audit'
    ],
    'IT Technical': [
        'server', 'system alert', 'password reset', 'access request',
        'vpn', 'outage', 'incident', 'ticket', 'helpdesk',
        'software update', 'security alert', 'breach', 'firewall'
    ],
    'Marketing': [
        'campaign', 'creative brief', 'media plan', 'agency',
        'brand', 'social media', 'content plan', 'launch',
        'advertising', 'proposal', 'partnership'
    ],
    'No Action Required': [
        'unsubscribe', 'newsletter', 'promotion', 'offer',
        'deal', 'sale', 'discount', 'notification', 'alert',
        'reminder', 'reward', 'expiring', 'verify your email'
    ]
}

def check_rules(email: dict) -> dict | None:
    """
    Layer 1: Check simple rules before calling AI.
    Returns a category result if confident, None if unsure.
    """
    sender = email.get('sender', '').lower()
    subject = email.get('subject', '').lower()
    body = email.get('body_clean', '').lower()
    combined = f"{subject} {body}"

    # Check sender domain against known no-action list
    for domain in NO_ACTION_DOMAINS:
        if domain in sender:
            return {
                "category": "No Action Required",
                "confidence": 0.95,
                "reason": f"Sender domain {domain} is a known automated sender",
                "categorised_by": "rules"
            }

    # Check for unsubscribe link — strong signal for No Action
    if 'unsubscribe' in body:
        return {
            "category": "No Action Required",
            "confidence": 0.90,
            "reason": "Email contains unsubscribe link",
            "categorised_by": "rules"
        }

    # Check keywords for each category
    for category, keywords in CATEGORY_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in combined]
        if len(matches) >= 2:
            return {
                "category": category,
                "confidence": 0.85,
                "reason": f"Matched keywords: {', '.join(matches)}",
                "categorised_by": "rules"
            }

    # Rules couldn't decide — pass to AI
    return None


# ─────────────────────────────────────────
# LAYER 2 — Claude AI Categorisation
# ─────────────────────────────────────────

CATEGORIES = [
    "IT Technical",
    "Marketing",
    "Tax",
    "No Action Required",
    "Others",
    "Unclassified"
]

# Priority order — if email could fit two categories, higher wins
CATEGORY_PRIORITY = {
    "Tax": 1,
    "IT Technical": 2,
    "Marketing": 3,
    "Others": 4,
    "No Action Required": 5,
    "Unclassified": 6
}

def call_claude(email: dict) -> dict:
    """
    Layer 2: Send email to Claude for categorisation.
    Returns category + confidence + reason.
    """
    client = anthropic.Anthropic()

    prompt = f"""You are an email categorisation engine for a business inbox.

Classify the following email into EXACTLY one of these categories:
{json.dumps(CATEGORIES)}

Category definitions:
- "IT Technical": IT issues, system alerts, password resets, software, security incidents, IT vendor emails
- "Marketing": Business marketing emails, campaign briefs, agency proposals, brand work, advertising
- "Tax": IRAS notices, GST, invoices, tax filings, CPF, payroll, accounting emails
- "No Action Required": Newsletters, promotions, automated notifications, marketing emails, app updates, rewards
- "Others": Legitimate business email that does not fit the above categories
- "Unclassified": Only if you genuinely cannot determine the category

Priority rule: If an email could fit multiple categories, use this priority order:
Tax > IT Technical > Marketing > Others > No Action Required > Unclassified

Reply ONLY with valid JSON. No explanation. No markdown. No extra text.

Email details:
Sender: {email['sender']}
Subject: {email['subject']}
Body: {email['body_clean']}

Required JSON format:
{{"category": "<category>", "confidence": <0.0 to 1.0>, "reason": "<one sentence>"}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()

    try:
        result = json.loads(raw)
        result['categorised_by'] = 'ai'
        return result
    except json.JSONDecodeError:
        # Claude returned something unexpected — safe fallback
        return {
            "category": "Unclassified",
            "confidence": 0.0,
            "reason": "AI returned unparseable response",
            "categorised_by": "ai"
        }


# ─────────────────────────────────────────
# LAYER 3 — Confidence Threshold Handler
# ─────────────────────────────────────────

def apply_confidence_threshold(result: dict) -> dict:
    """
    Layer 3: Decide what to do based on confidence score.
    Adds a 'action' field to tell the router what to do next.
    """
    confidence = result.get('confidence', 0)

    if confidence >= 0.80:
        result['action'] = 'route'
        result['review_needed'] = False

    elif confidence >= 0.50:
        result['action'] = 'route_with_review'
        result['review_needed'] = True

    else:
        result['category'] = 'Unclassified'
        result['action'] = 'hold'
        result['review_needed'] = True

    return result


# ─────────────────────────────────────────
# MAIN — Full Categorisation Pipeline
# ─────────────────────────────────────────

def categorise_email(email: dict) -> dict:
    """
    Master function. Runs all three layers in order.
    This is the only function you call from outside this file.
    """

    # Layer 1 — Rules
    result = check_rules(email)

    # Layer 2 — AI (only if rules didn't decide)
    if result is None:
        result = call_claude(email)

    # Layer 3 — Confidence threshold
    result = apply_confidence_threshold(result)

    # Attach original email metadata to result
    result['email_id'] = email.get('id')
    result['sender'] = email.get('sender')
    result['subject'] = email.get('subject')

    return result