# Use Rust official image for building the application
FROM rust:latest AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy Cargo manifest files separately for better caching
COPY Cargo.toml Cargo.lock ./

# Copy the config folder first
COPY config /app/config

# Copy the full source code
COPY . .

# Build the Rust application
RUN cargo build --release

# Use Debian Bookworm for runtime to match Rust image
FROM debian:bookworm-slim

# Install OpenSSL and necessary libraries
RUN apt-get update && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the runtime container
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/hypernova-listener .

# Copy the config folder from the builder stage
COPY --from=builder /app/config /app/config

# Set the entrypoint
CMD ["./hypernova-listener"]
