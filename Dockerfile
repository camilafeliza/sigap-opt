# Stage 1: Build Frontend (SolidJS + Ark UI + Tailwind)
FROM docker.io/library/node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Minimal Runtime Environment
FROM docker.io/library/node:20-alpine AS runner
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY scripts/ ./scripts/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
VOLUME /app/data
ENV PORT=8080 APP_HOST="0.0.0.0" GEMINI_MODEL="gemini-2.5-flash" DATABASE_URL="file:/app/data/sigap_opt.db"
EXPOSE 8080
ENTRYPOINT ["node", "scripts/mock-backend.js"]
