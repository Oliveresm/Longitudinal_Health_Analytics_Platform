# --- Rol de IAM para la Lambda de Ingesta ---
resource "aws_iam_role" "lambda_ingest_role" {
  name = "healthtrends-lambda-ingest-role"

  # Política de confianza: permite que el servicio Lambda asuma este rol
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "healthtrends-lambda-ingest-role"
  }
}

# --- Política de IAM: Permiso para SQS ---
resource "aws_iam_role_policy" "lambda_ingest_policy_sqs" {
  name = "healthtrends-lambda-ingest-policy-sqs"
  role = aws_iam_role.lambda_ingest_role.id

  # Política: permite a esta Lambda enviar mensajes a NUESTRA cola SQS
  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action   = "sqs:SendMessage",
        Effect   = "Allow",
        # Asegura que solo pueda escribir en esta cola específica
        Resource = aws_sqs_queue.new_results_queue.arn 
      }
    ]
  })
}

# --- Política de IAM: Permiso para escribir Logs ---
# (Recomendado para depuración)
resource "aws_iam_role_policy_attachment" "lambda_ingest_logs" {
  role       = aws_iam_role.lambda_ingest_role.name
  # Política gestionada por AWS para escribir logs en CloudWatch
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}