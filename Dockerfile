# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Empty VITE_API_URL so frontend uses relative URLs (same origin as backend)
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
RUN apk add --no-cache python3 make g++
WORKDIR /backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-build /backend/dist ./dist
# Frontend static files served by Express
COPY --from=frontend-build /frontend/dist ./public
RUN mkdir -p /data /app/uploads
EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
