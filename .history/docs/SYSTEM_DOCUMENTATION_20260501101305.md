# CFCT Church Management System - Full Documentation

## 1. Document Purpose
This document provides complete technical and functional documentation for the CFCT Church Management System, including:
- System architecture and technology stack
- Church hierarchy model (Local Member up to National level)
- Roles, permissions, and access boundaries (who can do what and cannot do what)
- Core workflows (registration, approvals, payments, reporting)
- API and module overview
- Deployment and operations guidance

This documentation is based on the current implementation in this repository.

## 2. System Overview
CFCT is a multi-level church management platform for Christian Fellowship Church Tanzania.

It supports:
- Public member self-registration
- Leader-managed member administration
- Hierarchical church governance: National -> Zone -> Region -> District -> Local Church
- Financial and offering workflows (cash, mobile money, bank transfer)
- Event, department, prayer, transfer, news, and notification management
- Dashboards per role and hierarchy level
- Bilingual UX (Kiswahili and English)

## 3. Church Hierarchy Model
The hierarchy is stored in a single `churches` table using a self-referencing parent.

Levels:
1. National
2. Zone
3. Region
4. District
5. Local Church

Implementation references:
- `backend/apps/churches/models.py`
- `Church` model with `church_type` and `parent_church`
- Proxy models (`Zone`, `Region`, `District`, `LocalChurch`) for admin organization

Hierarchy traversal is used for scoped access and reporting.

## 4. User Roles and Authority Boundaries
Roles are defined in `backend/apps/accounts/models.py`:
- `national_leader`
- `zone_leader`
- `regional_leader`
- `district_leader`
- `local_leader`
- `local_member`
- `finance_team`

### 4.1 General Access Scope Rule
Most core modules use hierarchy-scoped access through role + assigned church.

Reference helper:
- `get_accessible_churches(...)` in `backend/apps/api/views.py`
- Similar scope logic exists in member module (`backend/apps/members/views.py`)

### 4.2 Role Matrix (Functional)

#### National Leader
Can:
- View and manage data across all churches
- Approve and assign upper-level leadership
- Access national reporting and system-level administrative views
- Configure and oversee global workflows

Cannot:
- Bypass authentication/authorization requirements
- Perform actions blocked by object ownership rules in specific modules (where enforced)

#### Zone Leader
Can:
- Manage and view data within assigned zone scope (zone -> regions -> districts -> local churches)
- Participate in leadership and member governance within zone scope
- Use zone-level reporting views

Cannot:
- Access data outside assigned zone scope (except where explicitly public/read-only)
- Perform national-only actions

#### Regional Leader
Can:
- Manage and view data within assigned region scope (region -> districts -> local churches)
- Review and perform region-level governance actions

Cannot:
- Access other regions outside scope
- Perform zone-wide or national-only operations

#### District Leader
Can:
- Manage district scope (district -> local churches)
- Register/manage members and district-level activities

Cannot:
- Access other districts outside scope
- Perform region/zone/national-only actions

#### Local Leader (Pastor/Church Leader)
Can:
- Manage local church operations in assigned church
- Register members for own church
- Manage church-level workflows (events, offerings, departments, etc. within church scope)

Cannot:
- Manage other churches outside assignment
- Perform upper-hierarchy governance actions

#### Local Member
Can:
- Access member-level dashboard and personal features
- Submit member-level requests and interactions (e.g., prayer, own participation flows)

Cannot:
- Perform leadership governance actions
- Access administrative cross-member management endpoints

#### Finance Team
Can:
- Access finance-related operations where explicitly permitted in module code
- Participate in selected management workflows that allow `finance_team`

Cannot:
- Automatically inherit full leader powers unless endpoint explicitly allows it

## 5. Registration Flows

### 5.1 Public Self-Registration (Unauthenticated)
- Endpoint path: `/api/members/public/register/` and `/api/members/register/`
- Public user selects hierarchy and target local church
- System creates user as `local_member`, inactive/unapproved initially
- Creates `MemberRegistration` in `pending` state
- Notifies leaders of target church

References:
- `backend/apps/members/urls.py`
- `backend/apps/members/views.py` (`MemberRegisterView`)

### 5.2 Leader-Assisted Member Registration (Admin)
- Implemented in Django admin custom page
- Uses role-aware hierarchy auto-detection/scoping
- Prevents selecting churches outside leader scope

References:
- `backend/apps/members/admin.py`
- `backend/templates/admin/members/register_member.html`

### 5.3 Approval Workflow
- Registration statuses: `pending`, `approved`, `rejected`
- Leaders/admin approve or reject pending registrations
- On approve, user activation/approval fields are updated

Model reference:
- `backend/apps/members/models.py`

## 6. Offerings and Payment Workflows

### 6.1 Payment Methods
Supported offering payment methods:
- Cash
- Mobile Money
- Bank Transfer

### 6.2 Mobile Money (Tanzania)
- Uses Azampay integration for STK push
- Operator support: Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa
- Tracks payment status (`pending`, `completed`, `failed`)

### 6.3 Bank Transfer
- Generates unique transfer reference
- Provides church-specific bank details
- Verification flow via offering status and leadership follow-up

### 6.4 Church-Specific Payment Configuration
Each church has configurable payment details:
- Mobile money Lipa numbers per provider
- Bank account details

Model and API references:
- `backend/apps/churches/models.py` (`ChurchPaymentDetails`)
- `backend/apps/api/urls.py` (`/api/offerings/payments/config/`)
- `backend/apps/offerings/payment_service.py`

## 7. Core Backend Modules
Main Django apps in use:
- `accounts`: users, roles, approvals, admin leader management
- `churches`: church hierarchy, church profiles, payment details
- `members`: registration lifecycle, duplicate handling, imports/exports
- `offerings`: offering records and payment processing
- `attendance`: attendance tracking/check-in
- `events`: event lifecycle and registrations
- `departments`: church departments and member requests
- `news`: church news and updates
- `prayers`: prayer request system
- `transfers`: member transfer workflows
- `notifications`: in-app notifications
- `reports`: comparative and financial reporting
- `cms`: site content and public-facing management sections
- `api`: consolidated DRF endpoints and role-scoped business logic

## 8. API Surface Overview
The main API router is in:
- `backend/apps/api/urls.py`

Major endpoint groups include:
- `/api/token/`, `/api/token/refresh/` (JWT auth)
- `/api/auth/*` (profile/password flows)
- `/api/users/`, `/api/churches/`, `/api/members/`
- `/api/events/`, `/api/offerings/`, `/api/attendance/`
- `/api/prayers/`, `/api/transfers/`, `/api/notifications/`
- `/api/news/`, `/api/departments/`
- `/api/reports/*`, `/api/dashboard/*`
- `/api/offerings/payments/*` (Tanzania payment flows)

Member-specific API routes:
- `backend/apps/members/urls.py`

## 9. Frontend Architecture
Framework:
- React 18 + Vite + Tailwind CSS

Core patterns:
- JWT auth context
- Role-based routing and dashboard redirects
- Shared dashboard layout
- Language/theme providers

Key references:
- `frontend/src/App.jsx`
- `frontend/src/contexts/AuthContext.jsx`
- `frontend/src/pages/*`

Dashboards are role-specific:
- National, Zone, Regional, District, Church, Member

## 10. Security and Authentication

### 10.1 Authentication
- JWT-based auth via `rest_framework_simplejwt`
- Access + refresh token flow
- Login throttling and lockout policy

### 10.2 Authorization
- DRF permission classes + role checks in views
- Hierarchy-scoped filtering for data isolation
- Ownership checks in selected modules (e.g., creator-only update/delete rules)

### 10.3 Security Controls
Configured in `backend/config/settings.py`:
- CORS/CSRF controls
- HSTS/SSL options (production)
- Session and cookie hardening
- Request throttling rates

## 11. Technology Stack and Tools Used

### 11.1 Backend
- Python 3.12+
- Django 5.0
- Django REST Framework
- Simple JWT
- PostgreSQL (`psycopg2-binary`)
- Celery + Redis
- Django Channels + channels-redis
- Pandas, OpenPyXL, ReportLab (export/reporting)
- Requests (payment integrations)
- Gunicorn (production serving)

Source:
- `backend/requirements.txt`

### 11.2 Frontend
- React 18
- React Router v6
- Axios
- i18next/react-i18next
- Tailwind CSS
- Recharts
- react-hot-toast
- react-icons
- SWR
- Vite + vite-plugin-pwa

Source:
- `frontend/package.json`

### 11.3 DevOps/Deployment
- Docker support (`docker/`, `backend/Dockerfile`, `docker-compose` files)
- Render deployment configuration (`render.yaml`)
- Vercel frontend deployment pattern (as described in README)

## 12. Environment Configuration
Primary runtime settings are in:
- `backend/config/settings.py`

Important environment variables include:
- Django core: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- Database: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- CORS/CSRF: `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- Auth lockout/throttle: `MAX_FAILED_LOGIN_ATTEMPTS`, etc.
- Email settings: SMTP backend credentials
- Payments: `AZAMPAY_APP_NAME`, `AZAMPAY_CLIENT_ID`, `AZAMPAY_CLIENT_SECRET`
- Bank fallback values: `CHURCH_BANK_*`

## 13. Data Model Highlights

### 13.1 User
- Custom auth model (`accounts.User`)
- Role-based identity and church assignment
- Approval and profile metadata

### 13.2 Church
- Single-table hierarchy using `church_type` + `parent_church`

### 13.3 MemberRegistration
- One-to-one with user
- JSON sections: personal, guardian, spiritual
- Status lifecycle and approver metadata

### 13.4 Offering
- Offering type + payment method + payment status
- Transaction reference and receipt tracking

### 13.5 ChurchPaymentDetails
- Per-church payment channels and bank settings

## 14. Typical End-to-End Workflows

### Workflow A: Public Member Joins Church
1. Public user opens registration page
2. Selects hierarchy and target local church
3. Submits registration
4. Pending registration is created and leaders are notified
5. Leader approves/rejects
6. On approval, member account becomes active/approved

### Workflow B: Local Leader Registers Member Directly
1. Leader opens member registration in admin
2. Church hierarchy scope is auto-detected by role/church
3. Leader fills member details and submits
4. System validates selected church is within allowed scope
5. Member user + approved registration record are created

### Workflow C: Member Giving via Offerings
1. User selects offering type and payment method
2. For mobile money: STK push initiated through Azampay
3. For bank transfer: unique reference + church bank details provided
4. Offering status tracked and updated via polling/callback flow

## 15. Who Can Do What / Cannot Do What (Practical Summary)

### Can do
- Leaders can manage data within hierarchy scope defined by their role/church
- National leaders can manage system-wide data and top-level governance actions
- Local members can use member-facing features and self-service flows
- Finance team can use explicitly permitted financial/management endpoints

### Cannot do
- Any user cannot manage data outside role hierarchy scope (unless endpoint is public or explicitly unrestricted)
- Local members cannot perform leadership governance operations
- Non-national roles cannot perform national-only actions
- Users without required role/church association cannot complete scoped administrative actions

Note: exact behavior is endpoint-specific; this summary reflects implemented patterns in current code.

## 16. Admin and Operational Tools
- Django Admin (customized with additional role/hierarchy actions)
- CSV import/export tools for member registration workflows
- Duplicate detection and merge endpoints for member records
- Reporting/export endpoints for analytics and governance

## 17. Current Limitations and Implementation Notes
- Permission logic is centralized in patterns but still includes endpoint-specific rules; always validate target endpoint behavior before policy changes.
- Some routes and admin workflows are heavily customized and rely on hierarchy assumptions; changes should preserve parent-child church consistency.
- Existing short API docs in `docs/API_DOCUMENTATION.md` are minimal and should be treated as incomplete compared to this document.

## 18. Recommended Maintenance Practice
- Keep this document updated whenever roles, endpoints, or workflow logic changes.
- Add endpoint-level permission notes for any newly added critical feature.
- Maintain migration discipline for any hierarchy/role model changes.

## 19. File Index (Primary References)
- `README.md`
- `backend/config/settings.py`
- `backend/config/urls.py`
- `backend/apps/api/urls.py`
- `backend/apps/api/views.py`
- `backend/apps/accounts/models.py`
- `backend/apps/accounts/admin.py`
- `backend/apps/churches/models.py`
- `backend/apps/churches/views.py`
- `backend/apps/members/models.py`
- `backend/apps/members/views.py`
- `backend/apps/members/admin.py`
- `backend/apps/members/urls.py`
- `frontend/src/App.jsx`
- `frontend/package.json`
- `backend/requirements.txt`

---
Generated for the current repository state on 2026-05-01.
