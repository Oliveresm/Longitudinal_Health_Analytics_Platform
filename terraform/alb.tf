# --- 1. El Balanceador de Carga (ALB) ---
resource "aws_lb" "main_alb" {
  name               = "healthtrends-alb"
  internal           = false # ¡Público! Para que React pueda llegar a él
  load_balancer_type = "application"
  
  # El ALB vive en las subredes PÚBLICAS
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  security_groups    = [aws_security_group.alb_sg.id]

  tags = {
    Name = "healthtrends-alb"
  }
}

# --- 2. Grupo de Seguridad del ALB ---
resource "aws_security_group" "alb_sg" {
  name        = "healthtrends-alb-sg"
  description = "Permite trafico HTTP desde internet"
  vpc_id      = aws_vpc.main.id

  # Entrada: Permitir HTTP (puerto 80) desde cualquier lugar
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Salida: Permitir todo (para hablar con los contenedores ECS)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "healthtrends-alb-sg"
  }
}

# --- 3. Target Group (El grupo de contenedores destino) ---
resource "aws_lb_target_group" "portal_tg" {
  name        = "healthtrends-portal-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Requerido para Fargate

  health_check {
    path = "/" # La API tiene una ruta raíz que devuelve "HealthTrends API is running!"
  }
}

# --- 4. Listener (El oído del ALB) ---
resource "aws_lb_listener" "front_end" {
  load_balancer_arn = aws_lb.main_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.portal_tg.arn
  }
}

# --- 5. Output (La URL que usará React) ---
output "alb_dns_name" {
  description = "La URL publica del Balanceador de Carga"
  value       = aws_lb.main_alb.dns_name
}