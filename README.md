# Full-Stack Cross-Platform Ecosystem (lrningRestdj)

A comprehensive, production-grade cross-platform ecosystem featuring a robust **Django REST Framework (DRF)** synchronous API, serverless **Neon Postgres** indexing optimization, and twin client frontends built in **React** (Web) and **React Native** (Mobile via Expo). 

This platform seamlessly integrates resource discovery (Books tracking with external API readiness) and task orchestration (Category tracking & multi-user assignments) under a state-managed user workspace.

## Key Architectural Features

* **High-Speed Database Architecture:** Leverages ultra-fast sequential integer primary keys (`BigAutoField`) internally for lightning-fast database joins, while uniformly exposing secure `UUIDField` tracking strings to the public API to block sequential enumeration and resource scraping.
* **Granular Object-Level Permissions:** Custom, crash-proof authorization layers ensure anonymous traffic can view pages but never alter data. Write operations are strictly locked down to authenticated resource owners.
* **Modular Soft Deletion:** Implements a production-grade timestamp-based (`deleted_at`) soft delete manager loop. Soft deletion can be toggled on a model-by-model basis (active on Books, hard delete active on Tasks) to protect serverless cloud storage limits.
* **Dynamic Content Control (`to_representation`):** Serializers intercept outputs on-the-fly, truncating text previews for unauthenticated traffic and completely masking sensitive fields (like phone numbers) from data scrapers.
* **Cross-Platform Cross-Origin Execution:** Configured with robust Cross-Origin Resource Sharing (CORS) rule exceptions and dynamic host bounds (`0.0.0.0`) to handle stateless authenticated requests from React Web and React Native mobile clients smoothly.

---

## Project Directory Structure

```text
lrningRestdj/
│
├── backend/               # Django REST Framework API Service
│   ├── api/               # Core app (models, serializers, viewsets, filters, signals)
│   ├── core/              # Project configuration (settings, root URLs)
│   └── manage.py
│
├── frontend-web/          # React Web Client Application (Vite / Next.js)
│   └── ...
│
└── frontend-mobile/       # React Native Cross-Platform Mobile App (Expo)
    └── ...
```

---

## Quick Start (Backend Setup)

### 1. Create and activate a virtual environment (Windows PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies:
```powershell
pip install -r requirements.txt
```

### 3. Apply database migrations:
```powershell
python manage.py makemigrations
python manage.py migrate
```

### 4. Boot up the local development engine:
To let your **React Native phone app or emulator** connect to the backend, run the server bound to your local network IP:
```powershell
python manage.py runserver 0.0.0.0:8000
```
*(Make sure to update `ALLOWED_HOSTS` inside `core/settings.py` with your laptop's local network IP).*

---

## Core API Endpoint Directory

* **`POST /api/register/`** ➡️ Open user creation endpoint.
* **`POST /api/login/`** ➡️ Issues state-managed Access and Refresh bearer JWT tokens.
* **`GET /api/books/`** ➡️ Lists books (Truncates descriptions automatically for anonymous users).
* **`POST /api/books/<uuid>/restore/`** ➡️ Explicitly recovers a soft-deleted book row if requested by the owner.
* **`GET /api/tasks/`** ➡️ Private workspace query (Isolates data by logged-in user; returns a 404 for others).
