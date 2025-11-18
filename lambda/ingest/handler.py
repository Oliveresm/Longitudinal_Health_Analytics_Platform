import json
import os
import boto3

# Terraform nos dará esta URL como una variable de entorno
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL")

# Inicializar el cliente de SQS
sqs_client = boto3.client("sqs")

def lambda_handler(event, context):
    """
    Punto de entrada para la Lambda de ingesta.
    Recibe un evento de API Gateway, lo valida y lo envía a SQS.
    """
    print(f"Recibido evento: {event}")

    # 1. Validar y obtener el cuerpo (body)
    try:
        # El cuerpo de una solicitud POST de API Gateway está en 'body'
        body_str = event.get("body", "{}")
        if not body_str:
            body_str = "{}"
            
        body = json.loads(body_str)

        if not body:
            print("Cuerpo vacío recibido.")
            return {
                "statusCode": 400, # 400 Bad Request
                "body": json.dumps({"message": "Cuerpo de la solicitud vacío."})
            }
        
        # Validación simple (podemos hacerla más compleja después)
        if "patient_id" not in body or "test_code" not in body:
             return {
                "statusCode": 400,
                "body": json.dumps({"message": "Faltan patient_id o test_code."})
            }

    except json.JSONDecodeError:
        print("Cuerpo JSON mal formado.")
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "Cuerpo JSON mal formado."})
        }
    except Exception as e:
        print(f"Error al procesar el cuerpo: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error interno del servidor."})
        }

    # 2. Enviar a SQS
    try:
        print(f"Enviando mensaje a SQS: {SQS_QUEUE_URL}")
        
        sqs_client.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(body) # Enviamos el cuerpo validado
        )

        print("Mensaje enviado a SQS exitosamente.")

        # 3. Responder a API Gateway
        return {
            "statusCode": 202, # 202 Accepted (Aceptado)
            "body": json.dumps({"message": "Resultado aceptado y encolado para procesamiento."})
        }

    except Exception as e:
        print(f"Error al enviar a SQS: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error al encolar el mensaje."})
        }