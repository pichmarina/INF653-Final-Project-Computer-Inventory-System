# INF653 Final Project: Computer Inventory System

A web-based internal inventory system for tracking computer hardware,
peripherals, assignments, reference documents, audit history, users, roles,
API keys, and reports.

## Stack

- Backend: Node.js, Express.js
- Views: Handlebars (`hbs`)
- Database: MongoDB with Mongoose
- File storage: Local filesystem uploads
- Authentication: JWT for API access, HTTP-only JWT cookie for the UI
- Service access: Hashed API keys through the `x-api-key` header

## Requirements Coverage

- Inventory CRUD for computers and peripherals
- User creation, role assignment, enable/disable status, and bcrypt password hashing
- Admin-only API key generation, one-time raw key display, hashed storage, and revocation
- Check-out and check-in workflows with required reference/inspection document uploads
- Asset history with previous assignees, duration labels, notes, and document links
- Reports for inventory summary, assets older than three years, and assets by user
- Security middleware for CORS, rate limiting, request logging, JWT/API-key auth, and RBAC
- Soft delete flags preserve historical item and user data

## Environment

Copy `.env.example` to `.env` and set the values for your environment.

```env
PORT=3000
MONGO_URI=mongodb+srv://...
BASE_URL=https://your-deployed-app.example.com
CORS_ORIGIN=https://your-deployed-app.example.com
DEV_CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

`BASE_URL` and `CORS_ORIGIN` should be the deployed application origin. Keep
`DEV_CORS_ORIGINS` for local development only.

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## API Authentication

Use `POST /api/auth/login` to receive a JWT. Standard JSON API requests should
send the token as:

```http
Authorization: Bearer <token>
```

Service integrations can use an active API key on endpoints that explicitly
support API-key access:

```http
x-api-key: <raw-api-key>
```

## Deployment

Deploy the app to a Node-compatible cloud platform such as Render, Railway, AWS,
or DigitalOcean. A `render.yaml` blueprint is included for Render. Configure the
production environment variables above, especially `MONGO_URI`, `JWT_SECRET`,
`BASE_URL`, and `CORS_ORIGIN`.

Submission checklist:

- Live URL: add your hosted application URL here after deployment.
- GitHub repository: add your repository URL here before submission.
