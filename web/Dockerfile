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
    COPY . .
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
    ENV PORT=3000
    ENV HOSTNAME=0.0.0.0
    ENV HOST=0.0.0.0
    EXPOSE 3000
    CMD ["node", "server.js"]