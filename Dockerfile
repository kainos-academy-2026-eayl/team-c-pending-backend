# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

WORKDIR /app

# Trust an optional company CA without disabling TLS verification.
RUN --mount=type=secret,id=corporate_ca \
    if [ -s /run/secrets/corporate_ca ]; then \
      mkdir -p /usr/local/share/ca-certificates; \
      awk '/-----BEGIN CERTIFICATE-----/ { n++ } n { print > ("/usr/local/share/ca-certificates/corporate-" n ".crt") }' /run/secrets/corporate_ca; \
      cat /run/secrets/corporate_ca >> /etc/ssl/certs/ca-certificates.crt; \
    fi \
    && apk add --no-cache ca-certificates dumb-init openssl \
    && update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

FROM base AS builder

COPY package*.json .npmrc ./

# Run generation explicitly once the Prisma schema is available.
RUN npm ci --ignore-scripts && npm rebuild esbuild

COPY . .

RUN npx prisma generate --config prisma7.config.ts \
    && npm run build \
    && npm prune --omit=dev --ignore-scripts

FROM base AS production

ENV NODE_ENV=production PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const r = require('http').get('http://127.0.0.1:' + process.env.PORT + '/health', res => { res.resume(); process.exitCode = res.statusCode === 200 ? 0 : 1; }); r.setTimeout(2000, () => r.destroy(new Error('Health check timed out'))); r.on('error', () => { process.exitCode = 1; });"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
