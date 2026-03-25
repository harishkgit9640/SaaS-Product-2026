# FeeAutomate Backend

Production-grade boilerplate backend for a multi-tenant SaaS application using Node.js, Express, TypeScript, and PostgreSQL.

## Stack

- Node.js + Express
- TypeScript
- PostgreSQL (`pg`)
- Winston logger
- JWT utility structure

## Folder Structure

```text
src/
  app.ts
  server.ts
  config/
    env.ts
    db.ts
  controllers/
    healthController.ts
  middleware/
    auth.ts
    errorHandler.ts
    requestContext.ts
    requestLogger.ts
    tenantResolver.ts
  repositories/
    userRepository.ts
  routes/
    index.ts
  services/
    authService.ts
  types/
    auth.ts
    env.ts
  utils/
    httpError.ts
    jwt.ts
    logger.ts
```

## Run

1. Copy `.env.example` to `.env`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
