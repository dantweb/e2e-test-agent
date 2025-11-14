# E2E Test Agent - Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:20-bookworm-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    # Playwright browser dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libwayland-client0 \
    # Additional utilities
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libu2f-udev \
    libvulkan1 \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for testing in CI)
# In production, users can override entrypoint to run the app directly
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy additional files that might be needed
COPY .env.example ./

# Create workspace directory for mounted files
RUN mkdir -p /workspace

# Set the working directory to workspace for runtime
WORKDIR /workspace

# Default environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV BROWSER=chromium

# Create non-root user for security
RUN groupadd -r e2e && useradd -r -g e2e e2e && \
    chown -R e2e:e2e /app /workspace

# Switch to non-root user
USER e2e

# Entry point to run the application
ENTRYPOINT ["node", "/app/dist/index.js"]

# Default command (can be overridden)
CMD ["--help"]
