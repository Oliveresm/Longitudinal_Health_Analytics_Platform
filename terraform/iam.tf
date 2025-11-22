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


# --- Rol de IAM para el Servicio ECS "Processor" y "Portal" ---
resource "aws_iam_role" "ecs_processor_task_role" {
  name = "healthtrends-ecs-processor-task-role"

  # Política de confianza: permite que las tareas de ECS asuman este rol
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "healthtrends-ecs-processor-task-role"
  }
}

# --- Política de IAM: Permisos para SQS, Secrets, Logs y COGNITO ---
resource "aws_iam_role_policy" "ecs_processor_policy" {
  name = "healthtrends-ecs-processor-policy"
  role = aws_iam_role.ecs_processor_task_role.id

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        # Permiso para SQS (Leer y Borrar mensajes)
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Effect   = "Allow",
        Resource = aws_sqs_queue.new_results_queue.arn
      },
      {
        # Permiso para leer el secreto de la contraseña de RDS
        Action   = "secretsmanager:GetSecretValue",
        Effect   = "Allow",
        Resource = aws_secretsmanager_secret.db_password_secret.arn
      },
      {
        # Permisos básicos para que Fargate funcione (como pull de ECR)
        # y para escribir logs en CloudWatch
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = "*" # Estos permisos son generales
      },
      {
        # --- NUEVO: PERMISOS DE ADMINISTRACIÓN DE USUARIOS ---
        # Permite a la API (Portal) añadir/quitar usuarios de grupos en Cognito
        Action = [
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:ListUsers",
          "cognito-idp:ListGroups",
          "cognito-idp:AdminGetUser"
        ],
        Effect   = "Allow",
        Resource = aws_cognito_user_pool.user_pool.arn
      }
    ]
  })
}