# Dockerfile para Next.js 15+ (SSR completo vía standalone)

# Etapa 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copia deps e instala
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# 2. Copia TODO el proyecto (incluye next.config.ts, tsconfig.json, código fuente...)
COPY . .

# 3. Ejecuta el build standalone
RUN npm run build

# Etapa 2: Producción con standalone
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 1. Copia el servidor standalone y sus deps mínimas
COPY --from=builder /app/.next/standalone ./

# 2. Copia los assets estáticos de Next
COPY --from=builder /app/.next/static ./.next/static

# 3. Copia tu carpeta public
COPY --from=builder /app/public ./public

# Exponer el puerto donde corre Next.js
EXPOSE 3000

# Arranca el servidor standalone que Next generó
CMD ["node", "server.js"]
