# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js ./
COPY src/ src/
COPY public/ public/
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.12-slim
WORKDIR /app

# Install Ghostscript
RUN apt-get update && \
    apt-get install -y --no-install-recommends ghostscript && \
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
