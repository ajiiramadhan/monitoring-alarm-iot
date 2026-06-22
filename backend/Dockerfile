# =========================================================
# Dockerfile — IoT Monitoring Backend
# Build context HARUS root project (folder yang berisi backend/, frontend/, database/)
# =========================================================
FROM node:18-alpine

WORKDIR /app

# Install dependencies dulu (cache layer)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy seluruh source
COPY backend/ ./backend/
COPY database/ ./database/
COPY frontend/ ./frontend/

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]
