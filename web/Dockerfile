# --- deps ---
    FROM node:20-alpine AS deps
    WORKDIR /app
    
    # локальный кэш, чтобы не писать в /root/.npm
    ENV NPM_CONFIG_CACHE=/app/.npm
    
    # копируем только манифесты, чтобы кэш слоёв работал корректно
    COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* .npmrc* ./ 
    
    # ставим зависимости по наличию lock-файла
    # (никаких глобальных установок в /root)
    RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
        elif [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
        elif [ -f pnpm-lock.yaml ]; then npm -g i pnpm && pnpm i --frozen-lockfile; \
        else npm i --no-audit --no-fund; fi
    
    # --- builder ---
    FROM node:20-alpine AS builder
    WORKDIR /app
    ENV NODE_ENV=production
    
    # переносим установленные зависимости
    COPY --from=deps /app/node_modules ./node_modules
    COPY --from=deps /app/package*.json ./
    # остальной код
    COPY . .
    
    # сборка (Next.js / Vite и т.п.)
    RUN npm run build
    
    # --- runner (standalone) ---
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    
    # healthcheck utils
    RUN apk add --no-cache curl
    
    # копируем только то, что нужно для запуска standalone
    COPY --from=builder /app/.next/standalone ./ 
    COPY --from=builder /app/.next/static ./.next/static
    # COPY --from=builder /app/public ./public   # если появится public
    
    ENV PORT=3000
    ENV HOSTNAME=0.0.0.0
    ENV HOST=0.0.0.0
    EXPOSE 3000
    
    CMD ["node", "server.js"]