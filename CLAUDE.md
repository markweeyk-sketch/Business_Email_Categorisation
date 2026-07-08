# Business Email Categorisation — Project Context for Claude Code

## Project Overview
A Django-based business email triage system that automatically categorises, 
routes, and tracks emails for efficient team response. Built iteratively 
with Claude Code and Claude chat.

## Current Stack
- **Backend**: Django 6.0, Django REST Framework, Python 3.12
- **Database**: PostgreSQL (production via Railway), SQLite (local dev)
- **AI Classifier**: Anthropic Claude API (`claude-sonnet-4-6`) with rules engine fallback
- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Email**: Gmail API (OAuth 2.0, polling via management command)
- **Deployment**: Railway (Django + PostgreSQL), Vercel (React frontend)
- **Task Queue**: Celery + Redis (installed but not yet wired up)

## Project Structure
```
Business_Email_Categorisation/
├── config/                  # Django project settings, urls, wsgi, celery
├── emails/                  # Core models + admin + management commands
│   ├── models.py            # Email, Classification, RoutingLog
│   ├── admin.py             # Admin panel registration
│   └── management/commands/
│       ├── test_classifier.py   # Test classifier with sample emails
│       ├── gmail_auth.py        # OAuth flow for Gmail
│       ├── gmail_poll.py        # Poll Gmail inbox manually
│       └── create_admin.py      # Create superuser non-interactively
├── ingestion/               # Webhook + Gmail service
│   ├── views.py             # POST /api/ingestion/ingest/
│   └── gmail_service.py     # Gmail OAuth + message parsing
├── classifier/              # Classification logic
│   ├── service.py           # RulesEngine + ClassifierService
│   └── tasks.py             # Celery task (not yet wired)
├── routing/                 # Routing logic
│   └── service.py           # RoutingService — category → team inbox
├── dashboard/               # REST API for frontend
│   └── views.py             # Stats, email list, detail, reclassify, export
├── frontend/                # React dashboard
│   ├── src/
│   │   ├── App.jsx          # Main layout, state, filter wiring
│   │   ├── api.js           # All fetch calls — uses VITE_API_URL
│   │   └── components/
│   │       ├── MetricCards.jsx
│   │       ├── CategoryChart.jsx
│   │       ├── EmailTable.jsx
│   │       └── EmailDetail.jsx
│   ├── vite.config.js       # Proxy /api to localhost:8000 in dev
│   └── vercel.json          # Vercel deployment config
├── .env                     # Local environment variables (not in git)
├── .env.example             # Template for new developers
├── Procfile                 # Railway: collectstatic + migrate + create_admin
├── requirements.txt
└── runtime.txt              # python-3.12.0
```

## Database Models
```python
Email           # id (UUID), message_id, sender, subject, received_at, raw_body_hash
Classification  # email (FK), category, confidence, method, reason, 
                # requires_review, corrected_by, corrected_at, is_active
RoutingLog      # email (FK), classification (FK), routed_to, status, 
                # error_message, routed_at, resolved_at
```

## Email Categories
- IT Technical
- Marketing  
- Tax
- Others
- No Action Required
- Unclassified (fallback when confidence < 70%)

## Routing Map
- IT Technical → IT Technical inbox
- Marketing → Marketing inbox
- Tax → Tax inbox
- Others → Others inbox
- No Action Required → Archive
- Unclassified → Review Queue

## Classifier Logic
1. RulesEngine runs first — pattern matches on sender domain and subject keywords
2. If no match → ClassifierService calls Claude API (`claude-sonnet-4-6`)
3. If confidence < 0.70 → marked Unclassified, requires_review = True
4. Result saved as Classification record, old active classification deactivated

## API Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/ingestion/ingest/ | Receive email, classify, route |
| GET | /api/dashboard/stats/ | Totals, accuracy, category breakdown |
| GET | /api/dashboard/emails/ | Paginated list with filters |
| GET | /api/dashboard/emails/<id>/ | Email detail with classification |
| PATCH | /api/dashboard/emails/<id>/reclassify/ | Manual reclassification |
| GET | /api/dashboard/response-times/ | Avg response time per category |
| GET | /api/dashboard/export/ | CSV download |

## Environment Variables
```
DEBUG=True/False
SECRET_KEY=
DATABASE_URL=sqlite:///db.sqlite3 (local) or postgres://... (production)
ANTHROPIC_API_KEY=
REDIS_URL=redis://localhost:6379/0
GMAIL_WEBHOOK_SECRET=
CLASSIFIER_CONFIDENCE_THRESHOLD=0.70
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=
DJANGO_SUPERUSER_EMAIL=
```

## Deployment
- **Railway**: Django app + PostgreSQL. Auto-deploys from GitHub main branch.
  - Live URL: https://businessemailcategorisation-production.up.railway.app
  - Uses DATABASE_PUBLIC_URL for local management commands against production DB
- **Vercel**: React frontend. Auto-deploys from GitHub main branch.
  - Root directory: frontend
  - Environment variable: VITE_API_URL=https://businessemailcategorisation-production.up.railway.app

## Key Patterns
- Rules engine runs before Claude API to minimise API costs
- Raw email body never stored — only SHA-256 hash
- Multiple classifications per email supported — only one is_active at a time
- Duplicate emails detected by message_id
- Management commands used for Gmail polling (Pub/Sub not yet set up)

## What's Not Built Yet
- Gmail Pub/Sub (automatic email ingestion — currently manual polling)
- Celery wired up (installed but not connected)
- Outlook integration
- SLA alerts
- Mobile app (Expo — planned migration)

## Authentication — IMPLEMENTED (July 2026)

**Current state: DONE.** All `/api/dashboard/*` endpoints require DRF token
authentication (`Authorization: Token <token>`). Login endpoint:
`POST /api/auth/login/` with `{"username", "password"}` returns `{"token"}`.
The React dashboard has a login screen; the token is stored in localStorage
and sent on every request. CSV export is an authenticated blob download.

The Gmail webhook `/api/ingestion/ingest/` is NOT token-authenticated — it
requires the `X-Webhook-Secret` header to match `GMAIL_WEBHOOK_SECRET`
(enforced only when the env var is set, so make sure it is set on Railway).
`gmail_poll` writes to the DB directly and is unaffected.

Tokens are issued to existing Django users (superusers created via
create_admin or the admin panel work as-is). To revoke access, delete the
user's token in the admin panel or deactivate the user.

### Decision: DRF Token Authentication (not Firebase)

Chosen over Firebase Auth because:
- Project is already fully in the Django ecosystem — no new external 
  service or billing account needed
- Team is small and internal — no need for social login, password reset 
  flows, or MFA that Firebase would provide
- Simpler to implement — one line in settings.py plus a login endpoint, 
  vs installing firebase-admin SDK and writing token verification middleware

Firebase Auth was considered and is a legitimate, safe option (Google-backed, 
proper JWT handling) — revisit if the team grows, needs social login, or 
needs to authenticate the React web dashboard and Expo app against a 
consumer-facing identity provider rather than internal Django users.

### Implementation (completed)
1. ✅ `rest_framework.authtoken` in INSTALLED_APPS (config/settings.py)
2. ✅ Migration applied locally; Railway Procfile runs migrate on deploy
3. ✅ Login endpoint: POST /api/auth/login/ (DRF obtain_auth_token, config/urls.py)
4. ✅ `TokenAuthentication` + `IsAuthenticated` as REST_FRAMEWORK defaults —
   covers all DRF views; ingestion is a plain Django view so it's unaffected
5. ✅ frontend/src/api.js stores the token (localStorage) and sends the
   Authorization header; 401/403 clears the token and returns to login
6. ✅ frontend/src/components/Login.jsx — login screen; logout button in App.jsx
7. ✅ /api/ingestion/ingest/ protected by X-Webhook-Secret header check
   (hmac.compare_digest against GMAIL_WEBHOOK_SECRET)
8. ⬜ Expo app (not yet built) — same token flow, stored in expo-secure-store

## Migration Plan: Expo Mobile App

The system is being migrated to include an Expo React Native mobile app 
so team members can review and reclassify emails on mobile devices.

### Goals
- View dashboard metrics on mobile
- Review unclassified emails
- Reclassify emails with a single tap
- Push notifications for new unclassified emails
- Shared API with the existing Django backend

### Prerequisite
✅ Authentication (see section above) is implemented — the Expo app can
now be built against the token-authenticated API.

### Approach
- Keep Django backend unchanged except for adding auth (above)
- Keep React web dashboard unchanged except for adding token storage/header
- Add new Expo app that consumes the same REST API endpoints
- The existing /api/dashboard/* endpoints are already mobile-ready aside 
  from auth
- Railway (backend) and Vercel (web dashboard) are unaffected by this 
  migration — Expo is a third client, not a replacement for either

### Starting Point for Claude Code
When working on the Expo migration:
1. Read this file first
2. Authentication is implemented (POST /api/auth/login/ returns a token)
3. Read frontend/src/api.js to understand existing API calls
4. Read dashboard/views.py to understand available endpoints
5. Create the Expo app in a new folder: mobile/
6. Reuse the same API endpoints — do not modify Django backend logic, 
   only add auth as described above
7. Store the auth token securely on device (expo-secure-store, not 
   AsyncStorage)