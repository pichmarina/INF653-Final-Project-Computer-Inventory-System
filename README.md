# INF 653 Final Project — Computer Inventory System

A web-based internal tool for IT departments to manage the full lifecycle of computer hardware and peripherals — from procurement and assignment to reporting and audit history.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technical Stack](#technical-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Security & Middleware](#security--middleware)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [Deployment](#deployment)
- [Business Rules](#business-rules)

---

## Project Overview

The **Computer Inventory System (CIS)** is built as the INF 653 final group project. It provides IT administrators and technicians with a centralized dashboard to:

- Track hardware assets (computers and peripherals)
- Check items in and out with reference document uploads
- View chronological asset history per item
- Generate inventory, aging, and user audit reports
- Manage users, roles, and programmatic API keys

---

## Technical Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js |
| View Engine | Handlebars (`.hbs`) with server-side rendering |
| Database | MongoDB with Mongoose |
| File Storage | Cloudflare R2 (AWS S3-compatible) |
| Authentication | JWT (Bearer token for API; HTTP-only cookie for UI) |
| Service Access | Hashed API keys via `x-api-key` header |
| Security | Helmet, CORS, express-rate-limit, bcryptjs |
| Logging | Morgan (`common` format) |
| Deployment | Vercel |

---

## Features

### 4.1 Inventory Management (CRUD)
- Create, read, update, and soft-delete inventory items
- Fields: Item ID, Serial Number, Model, Brand, Category, Status, Date Acquired
- Classification: **Computer** (Laptop, Desktop, Server) and **Peripheral** (Monitor, Keyboard, etc.)
- Status options: `Available`, `In-Use`, `Maintenance`, `Retired`
- Items are never hard-deleted — `isDeleted` flag preserves history

### 4.2 User Management & Roles
- Admins can create user accounts via the UI or API
- Roles: `Admin` and `Technician`
- Admins can enable or disable any user account
- Passwords are hashed with **bcryptjs**; JWT issued on login
- Disabled users cannot log in, and their API keys are invalidated

### 4.3 API Key Management (Admin Only)
- Dedicated UI page for generating unique API keys for integrations
- Raw key displayed **once** upon creation; only the hash is stored
- Admins can list active keys and revoke (delete) them immediately

### 4.4 Check-In / Check-Out System
- **Check-out**: Assigns an `Available` item to a user with a required reference document upload
- **Check-in**: Returns item to `Available` with a required inspection document upload
- Items in `Maintenance` or `Retired` status cannot be checked out

### 4.5 Asset History Tracking
- Chronological transaction log for every check-in/out event
- Displays previous assignees, duration of use, notes, and document links

### 4.6 Reporting
- **Inventory Summary**: Total vs. deployed assets breakdown
- **Asset Aging**: Items older than 3 years
- **User Audit**: All assets currently associated with a specific user

---

## Project Structure

```
├── app.js                    # Express app entry point
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── apiKeyController.js
│   ├── authController.js
│   ├── itemController.js
│   ├── reportController.js
│   ├── transactionController.js
│   └── userController.js
├── middleware/
│   ├── apiKeyMiddleware.js    # x-api-key header validation
│   ├── authMiddleware.js      # JWT verification (API + cookie)
│   ├── avatarUploadMiddleware.js
│   ├── errorHandler.js
│   ├── rateLimiter.js        # 20 req/min global limiter
│   ├── roleMiddleware.js      # RBAC — Admin only
│   └── uploadMiddleware.js    # Multer for document uploads
├── models/
│   ├── ApiKey.js
│   ├── Item.js
│   ├── Transaction.js
│   └── User.js
├── routes/
│   ├── apiKeyRoutes.js
│   ├── authRoutes.js
│   ├── integrationRoutes.js
│   ├── itemRoutes.js
│   ├── reportRoutes.js
│   ├── transactionRoutes.js
│   ├── userRoutes.js
│   └── viewRoutes.js
├── utils/
│   ├── generateToken.js
│   ├── hashApiKey.js
│   ├── itemDisplayName.js
│   ├── documentStorage.js    # Cloudflare R2 document storage helpers
│   ├── seedAdmin.js          # Seeds default admin account
│   └── uploadPaths.js
├── views/                    # Handlebars templates
│   ├── layouts/main.hbs
│   ├── partials/
│   └── *.hbs
├── public/
│   ├── css/style.css
│   └── js/main.js
├── scripts/
│   └── syntax-check.js       # Project syntax test script
├── render.yaml               # Optional Render deployment config
└── .env.example
```

---

## Data Models

### Item
| Field | Type | Notes |
|---|---|---|
| itemId | String | Unique identifier |
| serialNumber | String | |
| model | String | |
| brand | String | |
| category | String | |
| classification | String | `Computer` or `Peripheral` |
| status | String | `Available`, `In-Use`, `Maintenance`, `Retired` |
| dateAcquired | Date | |
| assignedTo | ObjectId | Ref: User |
| isDeleted | Boolean | Soft delete flag |

### User
| Field | Type | Notes |
|---|---|---|
| name | String | |
| email | String | Unique, lowercase |
| passwordHash | String | bcryptjs hash |
| role | String | `Admin` or `Technician` |
| isEnabled | Boolean | Disabled users cannot log in |
| isDeleted | Boolean | Soft delete flag |

### Transaction
| Field | Type | Notes |
|---|---|---|
| item | ObjectId | Ref: Item |
| user | ObjectId | Ref: User |
| action | String | `checkout` or `checkin` |
| documentPath | String | Uploaded reference/inspection doc |
| notes | String | Optional notes |
| checkoutDate | Date | |
| checkinDate | Date | |

---

## API Endpoints

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| POST | `/api/auth/login` | Returns JWT token | Public (Rate Limited) |
| POST | `/api/users` | Create new user | JWT (Admin Only) |
| GET | `/api/users` | List all users | JWT (Admin Only) |
| PATCH | `/api/users/:id/role` | Update user role | JWT (Admin Only) |
| PATCH | `/api/users/:id/status` | Enable/Disable user | JWT (Admin Only) |
| POST | `/api/keys` | Generate a new API key | JWT (Admin Only) |
| GET | `/api/keys` | List all active API keys | JWT (Admin Only) |
| DELETE | `/api/keys/:id` | Revoke/Delete an API key | JWT (Admin Only) |
| GET | `/api/items` | List all inventory items | JWT or API Key |
| GET | `/api/items/:id` | Get item details | JWT |
| GET | `/api/items/:id/history` | Full history for an item | JWT |
| POST | `/api/items` | Create new item | JWT |
| PUT | `/api/items/:id` | Update item details | JWT |
| DELETE | `/api/items/:id` | Soft delete item | JWT (Admin Only) |
| POST | `/api/transactions/checkout` | Assign item + upload doc | JWT (Multipart) |
| POST | `/api/transactions/checkin` | Return item + upload doc | JWT (Multipart) |
| GET | `/api/reports/summary` | Inventory status summary | JWT |
| GET | `/api/reports/older-than-3-years` | Assets older than 3 years | JWT |
| GET | `/api/reports/assigned-by-user` | Assets by user | JWT |

> **API Key access**: Pass the key in the `x-api-key` request header for programmatic access to `GET /api/items`.

---

## Security & Middleware

| Requirement | Implementation |
|---|---|
| CORS | Strictly limited to `BASE_URL` / `CORS_ORIGIN` env values |
| Rate Limiting | 20 requests per minute per IP (`express-rate-limit`) |
| Request Logging | `morgan` in `common` format |
| JWT Protection | All `/api/*` routes (except `/api/auth/login`) require `Authorization: Bearer <token>` |
| Cookie Auth | UI routes use HTTP-only JWT cookie |
| API Key Auth | `x-api-key` header validated against hashed keys in the database |
| RBAC | `requireAdmin` middleware restricts user creation, key management, and item deletion |
| Helmet | HTTP security headers applied globally |
| Soft Delete | Items and users use `isDeleted` flags — no hard deletes |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Cloudflare R2 bucket (for document uploads)

### Installation

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
```

### Run the Application

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The app runs on `http://localhost:3000` by default.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | JWT expiry (e.g., `1d`) |
| `PORT` | Server port (default: `3000`) |
| `BASE_URL` | Public URL of the app (used for CORS) |
| `CORS_ORIGIN` | Allowed CORS origin |
| `DEV_CORS_ORIGINS` | Comma-separated extra origins for local dev (e.g. `http://localhost:3000`) |
| `APP_TIME_ZONE` | Display timezone for history timestamps; defaults to `Asia/Phnom_Penh` |
| `STORAGE_PROVIDER` | Storage backend (`r2` for Cloudflare R2) |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret access key |
| `R2_BUCKET` | Cloudflare R2 bucket name |
| `R2_PUBLIC_BASE_URL` | Public base URL for served R2 objects |

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | 123456 |
| Technician | julie@gmail.com | 123456 |

---

## Deployment

- **Live URL**: https://computer-inventory-system.vercel.app
- **Platform**: Vercel
- **Build Command**: `npm install`
- **Start Command**: `npm start`

---

## Business Rules

- Items with status `Maintenance` or `Retired` **cannot** be checked out
- Disabled users **cannot** authenticate; their API keys are invalidated
- Items and users are **never hard-deleted** — `isDeleted` flags preserve historical transaction logs
- API keys are **hashed** in the database; the raw key is shown only once upon creation

---

## Submission Checklist

- **Live URL**: https://computer-inventory-system.vercel.app
- **GitHub repository**: https://github.com/pichmarina/INF653-Final-Project-Computer-Inventory-System
