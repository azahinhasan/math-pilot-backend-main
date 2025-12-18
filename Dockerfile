################################################################################
# STAGE 1: DEPENDENCIES
# Install production dependencies for optimal layer caching
################################################################################
FROM node:22-alpine AS deps
LABEL stage=dependencies
WORKDIR /app
# Build deps for native modules
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

################################################################################
# STAGE 2: BUILD
# Compile TypeScript source code to JavaScript
################################################################################
FROM node:22-alpine AS builder
LABEL stage=builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force
COPY . .
RUN npx prisma generate
RUN npm run build
# Prune dev dependencies after generate/build to keep generated Prisma client but remove extras
RUN npm prune --production

################################################################################
# STAGE 3: PRODUCTION RUNTIME
# Minimal production image with only runtime dependencies
################################################################################
FROM node:22-alpine AS runner
LABEL stage=production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl  # Add this line to fix OpenSSL detection
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
# Copy pruned node_modules (with generated Prisma client) from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json
USER nestjs
EXPOSE 3000
CMD ["node", "dist/src/main"]