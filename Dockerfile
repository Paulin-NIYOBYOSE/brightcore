# syntax=docker/dockerfile:1
#
# BrightCore Careers image, in stages:
#   deps     install dependencies (also generates the Prisma client)
#   builder  build the app; Docker Compose also uses this stage to run
#            migrations, the seed script and the automated tests
#   runner   small production image with the standalone Next.js server
#
# Everything runs as the unprivileged `node` user.

FROM node:24-alpine AS base
# OpenSSL is needed by Prisma's migration engine on Alpine.
RUN apk add --no-cache openssl
WORKDIR /app
RUN chown node:node /app
ENV NEXT_TELEMETRY_DISABLED=1
USER node

FROM base AS deps
COPY --chown=node:node package.json package-lock.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npx prisma generate \
  && npm run build \
  && mkdir -p -m 700 storage/cvs

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CV_STORAGE_DIR=/app/storage/cvs
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Private CV storage: outside the web root, mounted as a volume by Compose.
RUN mkdir -p -m 700 storage/cvs
EXPOSE 3000
CMD ["node", "server.js"]
