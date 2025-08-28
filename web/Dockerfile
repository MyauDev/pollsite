# --- deps ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* .npmrc* ./
RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm -g i pnpm && pnpm i --frozen-lockfile; \
    else npm i; fi

# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json first (needed for npm run build)
COPY package.json ./

# Copy configuration files first (these change less frequently)
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Copy source code (this invalidates cache when code changes)
COPY app/ ./app/
COPY components/ ./components/

# Add build timestamp to ensure fresh builds
ARG BUILD_DATE
ENV BUILD_DATE=${BUILD_DATE}
RUN echo "Building at: ${BUILD_DATE}"

RUN npm run build
    
# --- runner (standalone) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# для healthcheck с curl из docker-compose.yml
RUN apk add --no-cache curl

# копируем только необходимые артефакты
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# если появится публичная папка - раскомментируй:
# COPY --from=builder /app/public ./public

# Add build info for debugging
ARG BUILD_DATE
ENV BUILD_DATE=${BUILD_DATE}
LABEL build_date=${BUILD_DATE}

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]