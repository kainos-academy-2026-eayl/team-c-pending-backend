# Technologist Academy Node Service Template

A starter repository for building Node.js HTTP services in the Technologist Academy.

This project provides an Express service with TypeScript, a production build, Biome linting, and Vitest tests. `GET /health` returns service status and the current UTC timestamp. 

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| [nvm](https://github.com/nvm-sh/nvm) | latest | Required. Manages your Node version per project. |
| Node.js | 22 | Pinned in [.nvmrc](.nvmrc). Install it with nvm, not with a system installer. |
| npm | 10+ | Ships with Node 22. |

Install nvm, then from the repository root run:

```sh
nvm install   # reads .nvmrc and installs Node 22
nvm use       # switches this shell to Node 22
```

Run `nvm use` every time you open a new terminal in this project, or configure your shell to do it automatically. Using a different Node version may cause confusing build failures.

Verify you are on the right version:

```sh
node -v   # should print v22.x.x
```

## Quick start

```sh
nvm use
npm ci             # install exact dependency versions from package-lock.json
cp .env.example .env
npm run dev        # start the service with hot reload
```

Then in another terminal:

```sh
curl http://localhost:3000/health
# {"status":"UP","time":"2026-10-15T12:00:00.000Z"}
```

Use `npm ci` rather than `npm install`. It installs the exact versions recorded in `package-lock.json`, so everyone on the team runs identical dependencies. Use `npm install` only when you are deliberately adding or upgrading a package.

## Customer, product, and order IDs

Customer records use `customerID` and product records use `productID`, including
API responses from `/customers`, `/register`, `/products`, and
`/products/category`. Clients must use these fields instead of `id`. JWT subjects
still contain the numeric customer ID as a string.

The Prisma schema also defines:

- `Order`: `orderID`, `customerID`, `status`, `date`, and `type`. Each order belongs
  to a customer. `status` and `type` are required strings; `date` defaults to the
  creation time.
- `ProductOrder`: `ProductID`, `OrderID`, and `Quantity`. The product/order pair is
  the composite primary key, allowing one quantity per product in each order.
- `BasketEntry`: `customerID`, `productID`, and `quantity`, with the customer/product
  pair as its composite primary key.

The ID migration renames existing columns without replacing their values.
Existing basket relationships are preserved. No order HTTP endpoints are added.
Apply pending migrations to the intended database and regenerate the client:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

### Sample orders

For development, the configured seed script creates three `Order` records
(`pending`, `processing`, and `completed`) and four linked `ProductOrder` records.
It uses the first existing customer and first two existing products, ordered by
ID, without modifying those records. At least one customer and two products must
already exist. The sample order types are `delivery` and `collection`.

After applying migrations and generating Prisma Client, run:

```sh
npx prisma db seed --config prisma7.config.ts
```

Each run adds three new orders; it does not replace or deduplicate previous
samples. All sample orders and their product links are inserted in one
transaction. Only run this against a development database.

## Current customer name

After signing in with `POST /login`, send the returned `accessToken` to
`GET /me` in the `Authorization` header:

```sh
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The API verifies the token's signature and expiry, then uses its `sub` customer ID
to look up the customer's current name. A successful response contains only:

```json
{ "firstName": "Alex", "lastName": "Smith" }
```

Missing, invalid, or expired tokens, and tokens for customers that no longer
exist, receive `401 Unauthorized`. Set a strong, non-empty `JWT_SECRET` on the
backend, matching the secret used to issue login tokens. Never expose it to the
frontend.

## Making it your own

After clicking **Use this template** on GitHub and creating your own repository:

1. Clone your new repository and run the quick start steps above.
2. Update the identity fields in [package.json](package.json):
   - `name` — your service name in kebab-case, e.g. `booking-service`
   - `description` — one line describing what your service does
   - `author` and `license`
   - `version` — reset to `0.1.0` if you prefer to start fresh
3. Replace this README with documentation for your own service.
4. Update `PORT` in [.env.example](.env.example) if your service should default to a different port, and keep it in sync with your own `.env`.
5. Delete or replace the sample `/health` route once you have real endpoints — though keeping a health check is good practice for deployments.

Never commit your `.env` file. It is already listed in [.gitignore](.gitignore); `.env.example` is the committed template that documents which variables are needed.

## Scripts

| Script | Command | What it does |
| --- | --- | --- |
| `npm run dev` | `tsx watch src/index.ts` | Runs the service from TypeScript source and restarts on file changes. Use this while developing. |
| `npm run typecheck` | `tsc` | Checks types without emitting files. |
| `npm run build` | `tsc` then `esbuild` | Type-checks, then bundles the service into `dist/index.js` for production. |
| `npm start` | `node dist/index.js` | Runs the built output. Requires `npm run build` first. |
| `npm test` | `vitest run` | Runs all tests in `test/`. |
| `npm run test:ui` | `vitest --ui` | Opens the local Vitest test dashboard. |
| `npm run test:coverage` | `vitest run --coverage` | Generates reports in `coverage/`; requires 100% statements, branches, functions, and lines across `src/`. |
| `npm run lint` | `biome check .` | Checks formatting, imports, and lint rules without changing files. |
| `npm run lint:fix` | `biome check --write .` | Applies safe automatic lint and formatting fixes. |

`npm ci` installs Husky hooks through the `prepare` script. The pre-push hook runs `npm run lint` and blocks the push on failure. Run `npm run lint:fix`, review the changes, and rerun lint before pushing. Hooks can be bypassed locally, so CI checks are required as well.

Tests use Vitest, with an HTTP test for the health endpoint and mocked startup, port validation, and shutdown tests. No manually running service or browser binaries are required. Test discovery and source coverage thresholds are configured in `vitest.config.ts`.

## Continuous Integration

Backend CI runs on pull requests targeting `main` or `master`, and on pushes to either branch (including merges). The `Backend Checks` job installs locked dependencies, builds, lints, and runs tests with enforced 100% coverage. Coverage reports are uploaded as a workflow artifact.

To block merges when checks fail, a repository administrator must configure GitHub **Settings > Rules > Rulesets** (or branch protection) for the default branch:

- Require a pull request before merging.
- Require status checks to pass, selecting `Backend Checks` after its first workflow run.
- Require the branch to be up to date before merging and prevent bypasses as appropriate for the team.

Committing a workflow alone does not enforce merge protection. GitHub must run the workflow successfully before its check can be selected. The frontend repository needs its own corresponding workflow; this repository contains only the backend.

## Project structure

```
.
├── src/
│   ├── index.ts          # entry point: config, server startup, shutdown
│   └── app.ts            # builds the Express app and registers routes
├── .env                  # your local secrets and config (not committed)
├── .env.example          # template listing required env variables
├── .github/              # GitHub configuration
├── .gitignore            # files git should ignore
├── .npmrc                # pins the public npm registry for this project
├── .nvmrc                # the Node version this project uses
├── package.json          # project metadata, scripts and dependencies
├── package-lock.json     # exact dependency versions, committed
└── tsconfig.json         # TypeScript compiler and type-checking options
```

Generated folders — `node_modules/` and `dist/` — are ignored by git and safe to delete and regenerate.

### Why `app.ts` and `index.ts` are separate

[src/app.ts](src/app.ts) creates and configures the Express app but never starts listening. [src/index.ts](src/index.ts) reads configuration and starts the server. Keeping those responsibilities separate makes route registration independent from server startup.

## Adding a new route

Say you want a `GET /bookings` endpoint.

**1. Create the router** in `src/controllers/bookings.ts`:

```ts
import { Router, type Request, type Response } from 'express'

export const bookingsRouter = Router()

bookingsRouter.get('/', (_req: Request, res: Response) => {
  res.json({ bookings: [] })
})
```

**2. Register it** in [src/app.ts](src/app.ts):

```ts
import { bookingsRouter } from './controllers/bookings'

// inside createApp(), before `return app`
app.use('/bookings', bookingsRouter)
```

Imports do not need a `.js` extension — this project is configured for bundler-style module resolution.

**3. Verify:**

```sh
npm run typecheck
npm run build
```

If your route reads a JSON request body, add `app.use(express.json({ limit: '100kb' }))` in `createApp()` before your routes.

### Customer routes

[src/controllers/customer_controller.ts](src/controllers/customer_controller.ts) exports
`createCustomerRouter(customerService)`, mounted at `/customers` in
[src/app.ts](src/app.ts). The controller is created once per router, not per request.

- `GET /customers` returns customer IDs, first names, last names, and emails, never passwords.
- `POST /customers` delegates to the existing customer creation handler.

These routes currently have no authentication or authorization middleware. Restrict
access to the customer listing before exposing customer data publicly.

## Configuration

Environment variables are loaded from `.env` by [dotenv](https://github.com/motdotla/dotenv) at startup.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | yes | Port the service listens on. The service exits at startup if it is missing or invalid. |

The server binds to `0.0.0.0` so it is reachable from outside a container. Add new variables to both your `.env` and [.env.example](.env.example).

## Troubleshooting

**`Cannot find module` or unexpected type errors** — you may be on the wrong Node version. Run `nvm use`, then `rm -rf node_modules && npm ci`.

**`PORT environment variable is not set`** — you have not created your `.env`. Run `cp .env.example .env`.

**`EADDRINUSE`** — another process is already using that port. Stop it, or change `PORT` in `.env`.

**`npm start` fails with a missing file** — run `npm run build` first to generate `dist/`.
