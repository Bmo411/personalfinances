# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Configura Vite para que se pueda sobrescribir la URL desde container envs
RUN npm run build

# Production stage
FROM nginx:alpine

# Copia los archivos estáticos de React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuración custom de Nginx para soportar React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
