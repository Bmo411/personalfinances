# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copia los archivos estáticos de React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuración custom de Nginx para soportar React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
