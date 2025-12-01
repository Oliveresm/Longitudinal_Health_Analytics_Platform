# --- Rol de IAM para la Lambda de Ingesta ---
resource "aws_iam_role" "lambda_ingest_role" {
  name = "healthtrends-lambda-ingest-role"

  # Política de confianza
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

# --- Política de IAM: Permiso para SQS (Ingesta) ---
resource "aws_iam_role_policy" "lambda_ingest_policy_sqs" {
  name = "healthtrends-lambda-ingest-policy-sqs"
  role = aws_iam_role.lambda_ingest_role.id

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action   = "sqs:SendMessage",
        Effect   = "Allow",
        Resource = aws_sqs_queue.new_results_queue.arn
      }
    ]
  })
}

# --- Política de IAM: Permiso para Logs (Ingesta) ---
resource "aws_iam_role_policy_attachment" "lambda_ingest_logs" {
  role       = aws_iam_role.lambda_ingest_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


# --- Rol de IAM para el Servicio ECS (Processor y Portal) ---
resource "aws_iam_role" "ecs_processor_task_role" {
  name = "healthtrends-ecs-processor-task-role"

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

# --- Política de IAM: Permisos Completos para ECS ---
resource "aws_iam_role_policy" "ecs_processor_policy" {
  name = "healthtrends-ecs-processor-policy"
  role = aws_iam_role.ecs_processor_task_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        # SQS
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        Effect   = "Allow",
        Resource = aws_sqs_queue.new_results_queue.arn
      },
      {
        # Secrets Manager
        Action   = "secretsmanager:GetSecretValue",
        Effect   = "Allow",
        Resource = aws_secretsmanager_secret.db_password_secret.arn
      },
      {
        # ECR y Logs
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
        Resource = "*"
      },
      {
        # COGNITO (Gestión de Usuarios - Permisos Ampliados)
        Action = [
          "cognito-idp:ListUsers",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminRemoveUserFromGroup",
          "cognito-idp:AdminListGroupsForUser",  # ✅ Necesario para limpiar roles
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminDeleteUser",         # ✅ Necesario para borrar cuentas
          "cognito-idp:ListGroups"
        ],
        Effect   = "Allow",
        Resource = aws_cognito_user_pool.user_pool.arn
      }
    ]
  })
}

# --- Rol para el Trigger de Post-Confirmación ---
resource "aws_iam_role" "lambda_trigger_role" {
  name = "healthtrends-lambda-trigger-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# --- Política para el Trigger ---
resource "aws_iam_role_policy" "lambda_trigger_policy" {
  name = "healthtrends-lambda-trigger-policy"
  role = aws_iam_role.lambda_trigger_role.id

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action   = "cognito-idp:AdminAddUserToGroup",
        Effect   = "Allow",
        Resource = aws_cognito_user_pool.user_pool.arn
      },
      {
        Action = [
          "logs:CreateLogGroup", 
          "logs:CreateLogStream", 
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}


