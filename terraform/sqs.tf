# --- 1. Cola SQS para Ingesta de Resultados ---
# Actúa como un buffer desacoplado entre la API de ingesta (Lambda)
# y el servicio de procesamiento (ECS).
resource "aws_sqs_queue" "new_results_queue" {
  name = "healthtrends-new-results-queue"

  # (Opcional pero recomendado) Tiempo que el mensaje es invisible
  # después de ser leído (para darle tiempo al procesador de ECS).
  visibility_timeout_seconds = 300 # 5 minutos

  # (Opcional pero recomendado) Cuánto tiempo retener un mensaje si no se procesa.
  message_retention_seconds = 86400 # 1 día

  tags = {
    Name = "healthtrends-new-results-queue"
  }
}

# --- 2. Outputs ---
output "sqs_queue_url" {
  description = "La URL de la cola SQS de ingesta"
  value       = aws_sqs_queue.new_results_queue.id
}

output "sqs_queue_arn" {
  description = "El ARN de la cola SQS de ingesta"
  value       = aws_sqs_queue.new_results_queue.arn
}