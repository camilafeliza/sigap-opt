# Stage 1: Build Frontend (SolidJS + Ark UI + Tailwind)
FROM docker.io/library/node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* frontend/pnpm-workspace.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Build Backend & Embed Frontend Static Assets
FROM docker.io/library/rust:alpine AS backend-builder
RUN apk add --no-cache musl-dev gcc g++ make
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Pre-build dependency crates using dummy main.rs for layer caching
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY migrations/ ./migrations/
COPY src/ ./src/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
ENV RUSTFLAGS="-C target-feature=-crt-static"
RUN touch src/main.rs && cargo build --release

# Stage 3: Minimal Distroless / Alpine Runtime
FROM docker.io/library/alpine:3.20 AS runner
RUN apk add --no-cache ca-certificates tzdata libgcc libstdc++
WORKDIR /app
COPY --from=backend-builder /app/target/release/sigap-opt /app/sigap-opt
VOLUME /app/data
ENV DATABASE_URL="file:/app/data/sigap_opt.db" PORT=8080 APP_HOST="::" GEMINI_API_KEY="your-gemini-api-key-here"
EXPOSE 8080
ENTRYPOINT ["/app/sigap-opt"]
