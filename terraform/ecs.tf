# --- 1. Clúster de ECS (El "Cerebro") ---
resource "aws_ecs_cluster" "main_cluster" {
  name = "healthtrends-cluster"

  tags = {
    Name = "healthtrends-cluster"
  }
}

# --- 2. Definición de Tarea (Processor / Worker) ---
resource "aws_ecs_task_definition" "processor_task" {
  family                   = "healthtrends-processor-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  task_role_arn            = aws_iam_role.ecs_processor_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_processor_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "processor-container"
      image     = "${aws_ecr_repository.processor_repo.repository_url}:latest"
      essential = true
      
      environment = [
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.new_results_queue.id },
        { name = "DB_SECRET_ARN", value = aws_secretsmanager_secret.db_password_secret.arn },
        { name = "DB_HOST",       value = aws_db_instance.main_db.address }
      ]

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

# --- 3. Servicio del Processor ---
resource "aws_ecs_service" "processor_service" {
  name            = "healthtrends-processor-service"
  cluster         = aws_ecs_cluster.main_cluster.id
  task_definition = aws_ecs_task_definition.processor_task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = [aws_subnet.app_a.id, aws_subnet.app_b.id]
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false
  }
}

# --- 4. Grupo de Seguridad para Processor ---
resource "aws_security_group" "ecs_sg" {
  name        = "healthtrends-ecs-sg"
  description = "Seguridad para los contenedores ECS"
  vpc_id      = aws_vpc.main.id

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

# --- 5. Regla: RDS permite Processor ---
resource "aws_security_group_rule" "rds_allow_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.ecs_sg.id
}

# ==========================================
# SERVICIO DEL PORTAL (API WEB) - ACTUALIZADO
# ==========================================

# --- 1. Definición de Tarea del Portal ---
resource "aws_ecs_task_definition" "portal_task" {
  family                   = "healthtrends-portal-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  task_role_arn            = aws_iam_role.ecs_processor_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_processor_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "portal-container"
      image     = "${aws_ecr_repository.portal_repo.repository_url}:latest"
      essential = true
      
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ],

      # --- VARIABLES DE ENTORNO ACTUALIZADAS ---
      environment = [
        { name = "DB_SECRET_ARN", value = aws_secretsmanager_secret.db_password_secret.arn },
        { name = "DB_HOST",       value = aws_db_instance.main_db.address },
        
        # Inyectamos los IDs de Cognito para que Python pueda validar tokens
        { name = "USER_POOL_ID",  value = aws_cognito_user_pool.user_pool.id },
        { name = "APP_CLIENT_ID", value = aws_cognito_user_pool_client.app_client.id }
      ],

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/healthtrends-portal"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])
}

# --- 2. Servicio ECS del Portal ---
resource "aws_ecs_service" "portal_service" {
  name            = "healthtrends-portal-service"
  cluster         = aws_ecs_cluster.main_cluster.id
  task_definition = aws_ecs_task_definition.portal_task.arn
  launch_type     = "FARGATE"
  desired_count   = 1

  network_configuration {
    subnets          = [aws_subnet.app_a.id, aws_subnet.app_b.id]
    security_groups  = [aws_security_group.portal_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.portal_tg.arn
    container_name   = "portal-container"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.front_end]
}

# --- 3. Grupo de Seguridad para Portal ---
resource "aws_security_group" "portal_sg" {
  name        = "healthtrends-portal-sg"
  description = "Seguridad para el servicio Portal"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- 4. Regla: RDS permite Portal ---
resource "aws_security_group_rule" "rds_allow_portal" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.portal_sg.id
}