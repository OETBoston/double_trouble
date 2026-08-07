# syntax=docker/dockerfile:1

# ---- Build stage: compile TS and generate the Prisma client ----
FROM node:20-slim AS build
WORKDIR /app

# node:20-slim has no OpenSSL, which Prisma's query engine binary needs
# to detect/fetch the right build at generate time (and to actually run,
# in the runtime stage below) — without it, Prisma silently defaults to
# a guessed engine build that can fail at the first real query.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
# Runs inside this Linux container so Prisma fetches the linux query
# engine binary — running `prisma generate` on the host (e.g. macOS)
# and copying the result in would produce a binary this image can't use.
RUN npx prisma generate
RUN npm run build

# ---- Runtime stage: lean production image ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# Generated Prisma client artifacts — must come from the build stage,
# after npm ci above, so they aren't overwritten by the ungenerated
# package.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Cloud Run sets PORT itself (default 8080) and expects the container
# to listen on it; index.ts already reads process.env.PORT.
EXPOSE 8080
CMD ["node", "dist/index.js"]
