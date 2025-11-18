# --- Empaquetado de la Lambda ---
# Data source que empaqueta automáticamente nuestra carpeta de código
data "archive_file" "lambda_ingest_zip" {
  type        = "zip"
  source_dir  = "../lambda/ingest" # Apunta a tu carpeta de código
  output_path = "${path.module}/.terraform/lambda_ingest.zip"
}

# --- 1. Función Lambda de Ingesta ---
resource "aws_lambda_function" "ingest_lambda" {
  function_name = "healthtrends-ingest-function"
  
  # Usa el archivo .zip que acabamos de definir
  filename         = data.archive_file.lambda_ingest_zip.output_path
  source_code_hash = data.archive_file.lambda_ingest_zip.output_base64sha256

  # Rol de IAM que creamos en iam.tf
  role = aws_iam_role.lambda_ingest_role.arn
  
  # Configuración del runtime
  handler = "handler.lambda_handler" # Archivo: handler.py, Función: lambda_handler
  runtime = "python3.11"           # O la versión de Python que prefieras

  # ¡Clave! Pasa la URL de SQS a nuestro código Python
  environment {
    variables = {
      SQS_QUEUE_URL = aws_sqs_queue.new_results_queue.id
    }
  }

  tags = {
    Name = "healthtrends-ingest-function"
  }
}

# --- 2. Outputs ---
output "lambda_ingest_arn" {
  description = "El ARN de la función Lambda de ingesta"
  value       = aws_lambda_function.ingest_lambda.arn
}