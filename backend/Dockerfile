# syntax=docker/dockerfile:1.7

FROM rust:1-bookworm AS builder

WORKDIR /app

# 1) Cache dependency downloads separately from app code
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src \
    && echo 'fn main() {}' > src/main.rs \
    && cargo build --release \
    && rm -rf src

# 2) Real sources — only this layer rebuilds on code changes
COPY src ./src
COPY migrations ./migrations

RUN touch src/main.rs \
    && cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/selfdev-backend /app/selfdev-backend
COPY migrations ./migrations

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["./selfdev-backend"]
