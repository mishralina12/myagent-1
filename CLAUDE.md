# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project Name:** myagent-1 (Synthetic Content Manager API)

**Description:** A REST API for LinkedIn content automation that enables the workflow: discover topics → draft with AI → approve → publish → track analytics.

**Current Status:** Phase 1 completed - Foundation with authentication and database setup

**Tech Stack:**
- **Backend:** Node.js 20+ with TypeScript 5.5
- **Framework:** Fastify 4.28 (high-performance REST API)
- **Database:** PostgreSQL 16 with Drizzle ORM 0.33
- **Cache/Queue:** Redis 7 with BullMQ 5.12 (for scheduled publishing)
- **AI:** Anthropic Claude API (content generation)
- **Auth:** JWT with Passport.js, LinkedIn OAuth2
- **Deployment:** Docker with Docker Compose

## Architecture

### Directory Structure

```
src/
├── config/              # Environment-based configuration (12-factor app)
├── database/
│   ├── schema/          # Drizzle table definitions (users, drafts, etc.)
│   ├── migrations/      # Database migrations
│   └── client.ts        # Database connection
├── modules/             # Feature modules (domain-driven design)
│   ├── auth/            # JWT auth + OAuth strategies
│   ├── users/           # User management
│   ├── topics/          # Topic discovery
│   ├── drafts/          # AI content generation
│   ├── publishing/      # LinkedIn API integration
│   └── analytics/       # Metrics tracking
├── shared/              # Shared utilities
│   ├── middleware/      # Auth, rate limiting, error handling
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Helper functions
├── workers/             # BullMQ background workers (separate process)
├── app.ts               # Fastify app setup
├── server.ts            # HTTP server entry point
└── worker.ts            # Worker process entry point
```

### Database Schema (Drizzle ORM)

**Core Tables:**
- `users` - User accounts with JWT auth, preferences (brand voice, tone, hashtags)
- `oauth_providers` - LinkedIn/Google OAuth tokens (encrypted in production)
- `topics` - Content topics (manual, trending, AI-suggested)
- `drafts` - AI-generated posts with compliance checks
- `approvals` - Approval workflow tracking
- `schedules` - Scheduled posts with BullMQ job IDs
- `published_posts` - Published LinkedIn posts
- `analytics` - Post performance metrics

**Key Relationships:**
- Users → OAuth Providers (1:many)
- Users → Topics → Drafts → Approvals → Published Posts (cascade deletes)
- Schedules → Published Posts (optional scheduling)

### Key Architectural Patterns

1. **Module-Based Structure:** Each feature is self-contained (service, controller, routes) for maintainability and testing
2. **Dependency Injection:** Services instantiated in controllers, easy to mock for tests
3. **Middleware Chain:** Fastify decorates `authenticate` for protected routes
4. **Error Handling:** Centralized error handler in app.ts with proper status codes
5. **Type Safety:** Drizzle infers TypeScript types from schema, Zod for runtime validation
6. **Worker Separation:** BullMQ workers run as separate processes for horizontal scaling

## Development Commands

### Setup and Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Then edit .env with your API keys

# Start database and Redis
docker-compose up -d

# Generate and apply database migrations
npm run db:generate
npm run db:push
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Start worker process (for scheduled publishing)
npm run worker:dev

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Database Operations

```bash
# Generate new migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:push

# Reset database (WARNING: destructive)
npm run db:drop && npm run db:push
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Start production worker
npm run worker
```

### Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm test:ui

# Type check without building
npm run lint
```

## High-Level Code Architecture

### Authentication Flow

1. **User Registration/Login:**
   - POST /auth/register → Bcrypt password → JWT token
   - POST /auth/login → Verify password → JWT token
   - Token contains: `{ userId, email, iat, exp }`

2. **LinkedIn OAuth:**
   - GET /auth/linkedin → Generate auth URL with CSRF state
   - User authorizes on LinkedIn
   - GET /auth/linkedin/callback → Exchange code for token
   - Store in `oauth_providers` table with expiry

3. **Protected Routes:**
   - Use `preHandler: [app.authenticate]` in route config
   - Middleware verifies JWT, attaches `request.user`

### AI Content Generation (Phase 2 - Coming Next)

```typescript
// Service pattern example
class AIGeneratorService {
  async generateDraft(topic, userPreferences) {
    const prompt = buildPrompt(topic, userPreferences);
    const claude = new Anthropic({ apiKey: config.anthropic.apiKey });
    const message = await claude.messages.create({
      model: 'claude-3-5-sonnet-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0].text;
  }
}
```

### LinkedIn Publishing (Phase 3)

- OAuth token validation before each publish
- Token refresh if expired (60-day expiry)
- BullMQ for scheduled posts with retry logic (3 attempts, exponential backoff)
- Store published post URL and LinkedIn URN

### Rate Limiting

- Global: 100 requests per 15 minutes per user
- Expensive endpoints (AI generation): 10 requests per minute
- Uses Redis for distributed rate limiting

## Important Conventions

### Error Handling

- Always return consistent error format:
  ```json
  {
    "error": "Error Type",
    "message": "Human-readable message",
    "details": [] // Optional validation errors
  }
  ```
- Use appropriate HTTP status codes (400, 401, 403, 404, 409, 429, 500)
- Log errors with `request.log.error()` for debugging

### Validation

- Use Zod schemas for request validation
- Validate early in controllers before service calls
- Return detailed validation errors (field-level)

### Database Queries

- Always use Drizzle's query builder (type-safe)
- Use `.returning()` for insert/update to get results
- Leverage indexes for performance (see schema files)
- Example:
  ```typescript
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  ```

### JWT Tokens

- Never store sensitive data in JWT (only userId, email)
- Set expiration (default: 7 days)
- Always verify tokens in protected routes
- Generate on register/login

### OAuth Tokens

- Encrypt in production (currently plain text in dev)
- Check expiry before API calls: `isTokenExpired(provider.tokenExpiresAt)`
- Refresh automatically if expired and refresh token exists
- Scopes required for LinkedIn: `w_member_social` (posting)

## Environment Variables

**Required:**
- `JWT_SECRET` - Secure random string (min 32 chars)
- `ANTHROPIC_API_KEY` - Claude API key for content generation
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis connection

**Optional (OAuth):**
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` - LinkedIn app credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth (future)

**Defaults:**
- `PORT=3000`, `NODE_ENV=development`
- `RATE_LIMIT_MAX=100`, `RATE_LIMIT_WINDOW_MS=900000`

## Current Implementation Status

### Phase 1: Foundation ✅ COMPLETED

**Implemented:**
- ✅ Node.js + TypeScript project structure
- ✅ Fastify REST API with security (Helmet, CORS, rate limiting)
- ✅ PostgreSQL with complete database schema
- ✅ Drizzle ORM with migrations
- ✅ JWT authentication (register, login, protected routes)
- ✅ LinkedIn OAuth integration (connect, callback, status, disconnect)
- ✅ Docker Compose (postgres, redis)
- ✅ Health check endpoints (/health, /health/db, /health/redis)
- ✅ Error handling and validation

**Deliverables Achieved:**
- Users can register and login ✅
- Users can connect LinkedIn account ✅
- Database migrations work ✅
- Docker Compose configured ✅

### Phase 2: AI Content Generation ⏳ NEXT

**Planned:**
- Topic management CRUD endpoints
- AI Generator Service with Claude API
- Draft creation with AI (prompt engineering)
- Draft editing and versioning
- User preferences (brand voice, tone, hashtags)

### Phase 3: Approval & Publishing ⏳ UPCOMING

- Approval workflow endpoints
- Basic compliance checks (character limit, banned words)
- LinkedIn Publishing Service (immediate publish)
- Error handling for LinkedIn API rate limits

### Phase 4: Scheduled Publishing ⏳ UPCOMING

- BullMQ job queue setup
- Scheduling endpoints (create, list, cancel)
- Worker process for background publishing
- Retry logic with exponential backoff

### Phase 5: Analytics ⏳ FUTURE

- Collect LinkedIn post metrics (views, likes, shares)
- Analytics endpoints (per-post, overview)
- Daily collection worker

## Testing the API

### Start the API

```bash
# 1. Ensure Docker Desktop is running
# 2. Start services
docker-compose up -d

# 3. Run migrations
npm run db:push

# 4. Start dev server
npm run dev
```

### Test Authentication

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get user info (use token from login response)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <token>"
```

### Test LinkedIn OAuth

```bash
# Get LinkedIn auth URL
curl http://localhost:3000/auth/linkedin \
  -H "Authorization: Bearer <token>"

# Visit the authUrl in browser to authorize
# LinkedIn will redirect to callback

# Check connection status
curl http://localhost:3000/auth/linkedin/status \
  -H "Authorization: Bearer <token>"
```

## Common Development Tasks

### Adding a New Route

1. Create service in `src/modules/<feature>/<feature>.service.ts`
2. Create controller in `src/modules/<feature>/<feature>.controller.ts`
3. Create routes in `src/modules/<feature>/<feature>.routes.ts`
4. Register in `src/app.ts`:
   ```typescript
   const { featureRoutes } = await import('./modules/feature/feature.routes');
   await app.register(featureRoutes);
   ```

### Adding a New Database Table

1. Define schema in `src/database/schema/<table-name>.ts`
2. Export from `src/database/schema/index.ts`
3. Generate migration: `npm run db:generate`
4. Apply migration: `npm run db:push`

### Adding a Protected Route

```typescript
app.get('/protected-endpoint', {
  preHandler: [app.authenticate], // Requires JWT
}, async (request, reply) => {
  const userId = request.user.userId; // Available after auth
  // ... handler logic
});
```

## Troubleshooting

### Docker Issues

- **Error:** "Cannot connect to Docker daemon"
  - **Fix:** Start Docker Desktop

- **Error:** "Port 5432 already in use"
  - **Fix:** Stop other PostgreSQL instances or change port in docker-compose.yml

### Database Issues

- **Error:** "relation does not exist"
  - **Fix:** Run migrations: `npm run db:push`

- **Error:** "Connection refused"
  - **Fix:** Ensure PostgreSQL is running: `docker ps`

### TypeScript Errors

- **Error:** "Cannot find module"
  - **Fix:** Check path aliases in tsconfig.json
  - **Fix:** Run `npm install` if missing dependency

## Security Best Practices

- Never commit `.env` file (in `.gitignore`)
- Use strong JWT secret (min 32 random characters)
- Encrypt OAuth tokens at rest in production
- Enable HTTPS for production deployment
- Validate all user input with Zod schemas
- Rate limit all public endpoints
- Set appropriate CORS origins for production

## Performance Considerations

- Use database indexes on frequently queried fields
- Cache OAuth tokens (avoid re-fetching)
- Use BullMQ for async operations (don't block API)
- Limit AI token usage with `max_tokens`
- Use Redis for rate limiting (distributed)
- Horizontal scaling: run multiple API instances + workers

## Next Steps for Development

1. **Implement Phase 2:** Topic management and AI draft generation
2. **Add tests:** Unit tests for services, integration tests for auth
3. **Monitoring:** Add structured logging (JSON format)
4. **Documentation:** Generate OpenAPI/Swagger docs from routes
5. **CI/CD:** Set up GitHub Actions for automated testing

## Support and Documentation

- **Full implementation plan:** `.claude/plans/tranquil-snacking-dawn.md`
- **API documentation:** README.md
- **Drizzle docs:** https://orm.drizzle.team/
- **Fastify docs:** https://fastify.dev/
- **Anthropic Claude API:** https://docs.anthropic.com/
