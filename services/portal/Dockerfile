FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Exponer el puerto 80
EXPOSE 80

# Ejecutar con uvicorn en el puerto 80
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "80"]