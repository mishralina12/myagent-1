# Synthetic Content Manager API

A REST API for LinkedIn content automation: discover topics → draft with AI → approve → publish → track analytics.

## Tech Stack

- **Backend:** Node.js + TypeScript
- **Framework:** Fastify
- **Database:** PostgreSQL with Drizzle ORM
- **Cache/Queue:** Redis with BullMQ
- **AI:** Anthropic Claude API
- **OAuth:** LinkedIn + Google
- **Deployment:** Docker + Docker Compose

## Features

- ✅ User authentication with JWT
- ✅ LinkedIn OAuth integration for posting
- ⏳ AI-powered content generation (Phase 2)
- ⏳ Approval workflows (Phase 3)
- ⏳ Scheduled publishing with BullMQ (Phase 4)
- ⏳ Analytics tracking (Phase 5)

## Prerequisites

- **Node.js:** v20 or higher
- **Docker:** For PostgreSQL and Redis
- **npm:** Package manager

## Quick Start

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Generate a secure JWT secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secure-jwt-secret

# Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-api-key

# Get from https://www.linkedin.com/developers/apps
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

### 3. Start Database and Redis

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 4. Run Database Migrations

```bash
npm run db:generate
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

The API will be available at http://localhost:3000

## API Endpoints

### Health Checks

- `GET /health` - API health status
- `GET /health/db` - Database connection status
- `GET /health/redis` - Redis connection status

### Authentication

- `POST /auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "name": "John Doe",
    "password": "securepassword123"
  }
  ```

- `POST /auth/login` - Login and get JWT token
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```

- `GET /auth/me` - Get current user info (requires auth)

### LinkedIn OAuth

- `GET /auth/linkedin` - Initiate LinkedIn OAuth flow (requires auth)
- `GET /auth/linkedin/callback` - OAuth callback endpoint
- `GET /auth/linkedin/status` - Check LinkedIn connection status (requires auth)
- `DELETE /auth/linkedin` - Disconnect LinkedIn account (requires auth)

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "name": "Test User"
    },
    "token": "eyJhbGc..."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Get Current User

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your-token>"
```

### 4. Connect LinkedIn Account

```bash
curl -X GET http://localhost:3000/auth/linkedin \
  -H "Authorization: Bearer <your-token>"
```

This returns an `authUrl` - visit it in your browser to authorize LinkedIn access.

### 5. Check Health

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/db
curl http://localhost:3000/health/redis
```

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run db:generate
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Run tests
npm test

# Type check
npm run lint
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t myagent-api .

# Run container
docker run -p 3000:3000 --env-file .env myagent-api
```

Or use Docker Compose for the full stack:

```bash
docker-compose up
```

## Project Structure

```
myagent-1/
├── src/
│   ├── config/              # Configuration management
│   ├── database/
│   │   ├── schema/          # Drizzle table definitions
│   │   ├── migrations/      # Database migrations
│   │   └── client.ts        # Database connection
│   ├── modules/             # Feature modules
│   │   ├── auth/            # Authentication & OAuth
│   │   ├── users/           # User management
│   │   ├── topics/          # Topic discovery
│   │   ├── drafts/          # AI content generation
│   │   ├── publishing/      # LinkedIn publishing
│   │   └── analytics/       # Metrics tracking
│   ├── shared/              # Shared utilities
│   │   ├── middleware/      # Auth, rate limiting
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── workers/             # BullMQ background workers
│   ├── app.ts               # Fastify app setup
│   ├── server.ts            # HTTP server entry
│   └── worker.ts            # Worker process entry
├── drizzle/                 # Generated migrations
├── .env.example             # Environment variables template
├── docker-compose.yml       # Docker services
├── Dockerfile               # API container
├── package.json
└── tsconfig.json
```

## Phase 1 Completed ✅

**What's implemented:**
- ✅ Node.js + TypeScript project setup
- ✅ Fastify REST API with security middleware
- ✅ PostgreSQL database with Drizzle ORM
- ✅ Complete database schema (users, oauth_providers, topics, drafts, etc.)
- ✅ JWT authentication (register, login, protected routes)
- ✅ LinkedIn OAuth integration (connect, callback, status, disconnect)
- ✅ Docker Compose for local development
- ✅ Health check endpoints
- ✅ Error handling and validation

**Deliverables achieved:**
- Users can register and login ✅
- Users can connect LinkedIn account ✅
- Database migrations work ✅
- Docker Compose runs locally ✅

## Next Steps (Phase 2)

**Goal:** AI content generation with Claude

1. Topic management endpoints (CRUD)
2. AI Generator Service with Anthropic Claude
3. Draft creation with AI
4. Draft management endpoints

See the [implementation plan](.claude/plans/tranquil-snacking-dawn.md) for full roadmap.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# View PostgreSQL logs
docker logs myagent-postgres

# Restart database
docker-compose restart postgres
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps

# Test Redis connection
docker exec -it myagent-redis redis-cli ping
```

### Port Already in Use

If port 3000 is already in use, change it in `.env`:

```env
PORT=4000
```

## Security Notes

- **JWT Secret:** Generate a secure random string (minimum 32 characters)
- **OAuth Tokens:** Stored in database (consider encryption for production)
- **Rate Limiting:** Default 100 requests per 15 minutes per user
- **HTTPS:** Required for production deployment
- **Environment Variables:** Never commit `.env` to version control

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
