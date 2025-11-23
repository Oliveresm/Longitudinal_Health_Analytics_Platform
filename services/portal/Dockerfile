FROM python:3.11-slim

WORKDIR /code

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos la carpeta 'app' completa
COPY ./app ./app

# Exponer el puerto
EXPOSE 80

# Ejecutar usando la ruta del módulo (app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]