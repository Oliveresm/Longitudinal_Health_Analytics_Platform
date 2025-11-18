# Usa una imagen oficial ligera de Python
FROM python:3.11-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Instala la única dependencia que necesitamos (el conector de PostgreSQL)
# 'boto3' ya está preinstalado en las imágenes Fargate, pero es bueno añadirlo
RUN pip install psycopg2-binary boto3

# Copia tu código Python al contenedor
COPY worker.py .

# Cuando el contenedor se inicie, ejecuta el script worker.py
CMD ["python", "worker.py"]