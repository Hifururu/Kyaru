# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

# Copiamos locks si existen (npm/pnpm/yarn) + package.json
# Así evitamos fallar si no existe alguno.
COPY package.json ./
COPY package-lock.json* ./
COPY pnpm-lock.yaml* ./
COPY yarn.lock* ./

# Instala deps de producción
RUN npm ci --omit=dev || npm install --omit=dev

# ============ Build ============
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Si usas variables de build (por ejemplo NEXT_TELEMETRY_DISABLED), puedes setearlas aquí
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ============ Runner ============
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copiamos todo lo necesario para arrancar
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080
CMD ["npm","run","start","--","-p","8080"]
