FROM node:22-slim

WORKDIR /app

# Copy root and service configs
COPY package.json ./
COPY backend/package.json backend/package-lock.json* ./backend/
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install dependencies cleanly
RUN npm install --prefix backend --production=false
RUN npm install --prefix frontend

# Copy all source files
COPY . .

# Build frontend static files
RUN npm --prefix frontend run build

# Default environment
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Start server
CMD ["node", "backend/src/server.js"]
