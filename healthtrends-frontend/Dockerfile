# Build React
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- INYECCIÓN DE VARIABLES DE ENTORNO ---
# 1. Recibimos los argumentos desde el pipeline (GitHub Actions)
# ... (inicio del archivo igual)

# --- INYECCIÓN DE VARIABLES DE ENTORNO ---
# 1. Recibimos los argumentos (Nombres actualizados para coincidir con el pipeline/.env)
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_APP_CLIENT_ID
# ✅ AGREGAR ESTAS DOS LÍNEAS:
ARG VITE_READ_URL
ARG VITE_INGEST_URL

# 2. Las exponemos como variables de entorno
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_APP_CLIENT_ID=$VITE_COGNITO_APP_CLIENT_ID
# ✅ AGREGAR ESTAS DOS LÍNEAS:
ENV VITE_READ_URL=$VITE_READ_URL
ENV VITE_INGEST_URL=$VITE_INGEST_URL

# ... (resto del archivo igual: COPY . ., RUN npm run build, etc)
# -----------------------------------------

COPY . .
RUN npm run build

# Servidor Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copia la configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]