# NyxScribe

> Every document. Signed, stored, controlled.

NyxScribe is a document management and e-signature platform built for compliance-driven organizations. Create, distribute, version, and collect sign-off on any document in a single auditable system. Pairs with Citadel for airtight compliance coverage.

---

## Features

| Feature | Description |
|---|---|
| 📁 Document Management | Upload, organize, and search documents with category and tag support |
| ✍️ E-Signature Collection | Send signature requests and collect legally traceable sign-offs |
| 🕒 Version Control | Track every document revision with SHA-256 content hashing |
| 🔔 Expiry & Renewal Alerts | Automatic expiration tracking with configurable alert windows |
| 📤 Bulk Distribution | Send documents to multiple recipients with batch tracking |
| 🛡️ Citadel Integration | Compliance status checks synced with the Citadel compliance platform |

---

## Technology Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript
- **Database**: SQLite (via `better-sqlite3`) — no external server required
- **Auth**: JWT (`jsonwebtoken`)
- **Testing**: Jest + ts-jest
- **Linting**: ESLint + Prettier

---

## Project Structure

```
NyxScribe/
├── src/                    # Backend source
│   ├── db/                 # Database connection & schema
│   ├── models/             # TypeScript interfaces
│   ├── services/           # Business logic layer
│   ├── routes/             # Express route handlers
│   ├── middleware/         # Auth & validation middleware
│   ├── server.ts           # Express app setup
│   └── app.ts              # Entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
├── tests/                  # Jest unit tests
└── uploads/                # File storage (local)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Install backend dependencies
npm install

# Build TypeScript
npm run build

# Start the server (production)
npm start

# Development mode (ts-node)
npm run dev
```

Server runs on **http://localhost:3001** by default.

### Frontend

```bash
cd frontend
npm install
npm start        # Development server on :3000
npm run build    # Production build
```

---

## API Reference

All responses follow the format:
```json
{ "success": true|false, "data": ..., "error": "..." }
```

Authentication is via `Authorization: Bearer <JWT>` header.

### Documents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents` | List documents (filters: `status`, `category`, `owner_id`, `search`) |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Archive document |
| POST | `/api/documents/:id/versions` | Upload new version (multipart) |
| GET | `/api/documents/:id/versions` | Get version history |
| GET | `/api/documents/:id/signatures` | Get all signature requests |

### Signatures

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/signatures/request` | Create signature request |
| GET | `/api/signatures/:id` | Get signature request |
| POST | `/api/signatures/:id/sign` | Submit signature |
| POST | `/api/signatures/:id/decline` | Decline signature request |

### Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alerts` | Get expiry alerts (default: 30 days ahead) |
| GET | `/api/alerts/upcoming` | Get upcoming expirations (default: 7 days) |
| POST | `/api/alerts/:documentId/acknowledge` | Acknowledge an alert |

### Distribution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/distribution/send` | Send document to a recipient |
| POST | `/api/distribution/bulk` | Bulk send to multiple recipients |
| GET | `/api/distribution/batches` | List distribution batches |
| GET | `/api/distribution/batches/:batchId` | Get batch status |

### Citadel Integration

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/citadel/check/:documentId` | Run compliance check |
| GET | `/api/citadel/status/:documentId` | Get compliance status |
| POST | `/api/citadel/sync` | Sync all documents with Citadel |

---

## Testing

```bash
npm test
```

Tests cover all four service layers using in-memory SQLite:
- `documentService` — CRUD, versioning, filtering, archiving
- `signatureService` — Request lifecycle, signing, declining, expiry
- `alertService` — Alert windows, expiry marking, acknowledgment
- `citadelService` — Compliance checks, status retrieval, bulk sync

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./nyxscribe.db` | SQLite database path |
| `JWT_SECRET` | `nyxscribe-dev-secret` | JWT signing secret (change in production!) |

---

## Database Schema

NyxScribe uses SQLite with the following tables:
- `users` — Platform users with roles (admin, manager, user)
- `documents` — Document metadata with status and expiry
- `document_versions` — File versions with SHA-256 content hashing
- `signature_requests` — E-signature lifecycle tracking
- `distribution_records` — Delivery tracking per recipient and batch
- `audit_logs` — Immutable audit trail for all actions
- `citadel_records` — Compliance status from Citadel integration
Document handler and e-signer
