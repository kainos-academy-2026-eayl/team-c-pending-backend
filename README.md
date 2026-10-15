# team-c-pending-backend

Team C Pending backend API, built with Express and TypeScript.

## Setup

Install the latest [nvm](https://github.com/nvm-sh/nvm#installing-and-updating), then run:

```sh
nvm install
nvm use
npm ci
```

The project uses Node.js 22 and npm 10 or newer.

## Commands

```sh
npm run dev    # Start with hot reload
npm run build  # Compile TypeScript into dist/
npm run start  # Run dist/index.js (build first)
npm test       # Build and test the health endpoint over HTTP
```

The server defaults to port 3000. Set `PORT` to override it:

```sh
PORT=3001 npm run dev
```

## Health Check

```sh
curl http://localhost:3000/health
```

Returns HTTP 200 with JSON containing `status` and the current UTC time in ISO 8601 format:

```json
{
	"status": "UP",
	"time": "2026-10-15T12:00:00.000Z"
}
```
