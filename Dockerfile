# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js ./
COPY .env .env
COPY src/ src/
COPY public/ public/
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.12-slim
WORKDIR /app

# Install Ghostscript + mozjpeg + pngquant + oxipng
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ghostscript \
        pngquant \
        wget \
        cmake \
        nasm \
        build-essential \
        libpng-dev && \
    # Install mozjpeg
    wget -q https://github.com/nicehash/cjpeg-mozjpeg/releases/download/v4.1.5/cjpeg-static-x86_64 -O /usr/local/bin/cjpeg && \
    chmod +x /usr/local/bin/cjpeg && \
    # Install oxipng
    wget -q https://github.com/shssoichiro/oxipng/releases/download/v9.1.3/oxipng-9.1.3-x86_64-unknown-linux-musl.tar.gz -O /tmp/oxipng.tar.gz && \
    tar xzf /tmp/oxipng.tar.gz -C /tmp && \
    mv /tmp/oxipng-9.1.3-x86_64-unknown-linux-musl/oxipng /usr/local/bin/oxipng && \
    chmod +x /usr/local/bin/oxipng && \
    rm -rf /tmp/oxipng* && \
    # Cleanup build deps
    apt-get purge -y wget cmake nasm build-essential && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY server/ server/

# Copy built frontend
COPY --from=frontend-build /app/dist /app/static

# Create uploads dir
RUN mkdir -p /app/server/uploads

EXPOSE 3001

WORKDIR /app/server
CMD ["python", "main.py"]
