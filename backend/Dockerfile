FROM rust:1-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

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
