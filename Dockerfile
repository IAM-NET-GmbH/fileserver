# Multi-stage build for IAM File Server
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY providers/package*.json ./providers/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build shared types first
RUN npm run build --workspace=shared

# Build backend
RUN npm run build --workspace=backend

# Build frontend
RUN npm run build --workspace=frontend

# Build providers
RUN npm run build --workspace=providers

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for Playwright and other tools
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata

# Set Playwright to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fileserver -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY providers/package*.json ./providers/

# Install production dependencies only
RUN npm ci --only=production --workspace=backend && \
    npm ci --only=production --workspace=shared && \
    npm ci --only=production --workspace=providers

# Copy built application
COPY --from=builder --chown=fileserver:nodejs /app/shared/dist ./shared/dist
COPY --from=builder --chown=fileserver:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=fileserver:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=fileserver:nodejs /app/providers/dist ./providers/dist

# Copy package.json files for runtime
COPY --chown=fileserver:nodejs shared/package.json ./shared/
COPY --chown=fileserver:nodejs backend/package.json ./backend/
COPY --chown=fileserver:nodejs providers/package.json ./providers/

# Create necessary directories
RUN mkdir -p /app/data /app/downloads /app/logs && \
    chown -R fileserver:nodejs /app/data /app/downloads /app/logs

# Create volumes for persistent data
VOLUME ["/app/data", "/app/downloads", "/app/logs"]

# Switch to non-root user
USER fileserver

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/ping', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "backend/dist/index.js"]
