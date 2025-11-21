# --- 1. Clúster de ECS (El "Cerebro") ---
resource "aws_ecs_cluster" "main_cluster" {
  name = "healthtrends-cluster"

  tags = {
    Name = "healthtrends-cluster"
  }
}

# --- 2. Definición de Tarea (La "Receta" del contenedor) ---
resource "aws_ecs_task_definition" "processor_task" {
  family                   = "healthtrends-processor-task"
  network_mode             = "awsvpc" # Requerido para Fargate
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256      # .25 vCPU
  memory                   = 512      # 512 MB RAM (Suficiente para el script)
  
  # El rol que permite al contenedor hablar con SQS y RDS
  task_role_arn            = aws_iam_role.ecs_processor_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_processor_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "processor-container"
      image     = "${aws_ecr_repository.processor_repo.repository_url}:latest" # Usa la imagen que subiste
      essential = true
      
      # Variables de entorno para que el script sepa a dónde conectarse
      environment = [
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.new_results_queue.id },
        { name = "DB_SECRET_ARN", value = aws_secretsmanager_secret.db_password_secret.arn },
        { name = "DB_HOST",       value = aws_db_instance.main_db.address }
      ]

      # Configuración de Logs (para ver los print() en CloudWatch)
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/healthtrends-processor"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])
}

# --- 3. El Servicio (El que mantiene al contenedor corriendo) ---
resource "aws_ecs_service" "processor_service" {
  name            = "healthtrends-processor-service"
  cluster         = aws_ecs_cluster.main_cluster.id
  task_definition = aws_ecs_task_definition.processor_task.arn
  launch_type     = "FARGATE"
  desired_count   = 1 # Queremos 1 copia del worker corriendo siempre

  # Configuración de Red (¡IMPORTANTE!)
  # El worker necesita salir a internet para hablar con SQS y ECR.
  # Por eso lo ponemos en las subredes de APP (que tienen acceso al NAT Gateway).
  network_configuration {
    subnets          = [aws_subnet.app_a.id, aws_subnet.app_b.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false # Privado, sale por NAT Gateway
  }
}

# --- 4. Grupo de Seguridad para ECS ---
resource "aws_security_group" "ecs_sg" {
  name        = "healthtrends-ecs-sg"
  description = "Seguridad para los contenedores ECS"
  vpc_id      = aws_vpc.main.id

  # Salida: Permitir TODO (necesario para bajar imágenes, hablar con SQS, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "healthtrends-ecs-sg"
  }
}

# --- 5. Regla Crítica: Permitir que ECS hable con RDS ---
# Actualizamos el SG de la base de datos para dejar entrar a ECS
resource "aws_security_group_rule" "rds_allow_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id     # Destino: RDS
  source_security_group_id = aws_security_group.ecs_sg.id     # Origen: ECS
}