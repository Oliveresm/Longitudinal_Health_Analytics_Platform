FROM python:3.11-slim

WORKDIR /code

# ✅ CORRECCIÓN 1: El archivo requirements.txt está dentro de la carpeta 'portal'
COPY portal/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ✅ CORRECCIÓN 2: La carpeta 'app' está al lado de 'portal' (dentro de 'services')
COPY app app

# Exponer el puerto
EXPOSE 80

# Ejecutar usando la ruta del módulo (app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]