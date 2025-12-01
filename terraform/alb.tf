# --- 1. El Balanceador de Carga (ALB) ---
resource "aws_lb" "main_alb" {
  name               = "healthtrends-alb"
  internal           = false 
  load_balancer_type = "application"
  
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  security_groups    = [aws_security_group.alb_sg.id]

  tags = {
    Name = "healthtrends-alb"
  }
}

# --- 2. Grupo de Seguridad del ALB ---
resource "aws_security_group" "alb_sg" {
  name        = "healthtrends-alb-sg"
  description = "Security Group del ALB con Whitelist de IPs"
  vpc_id      = aws_vpc.main.id

  # Solo permite tráfico HTTP (80) desde las IPs definidas en variables.tf
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_ips 
  }

  # Salida: Permitir todo
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

# --- 3A. Target Group para el BACKEND (API) ---
resource "aws_lb_target_group" "backend_tg" {
  name        = "healthtrends-backend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" 

  health_check {
    path                = "/" # Ruta raíz de FastAPI
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# --- 3B. Target Group para el FRONTEND (React) ---
resource "aws_lb_target_group" "frontend_tg" {
  name        = "healthtrends-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" 

  health_check {
    path                = "/" # Nginx sirve index.html
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# --- 4. Listener Principal (Regla por Defecto: Frontend) ---
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main_alb.arn
  port              = "80"
  protocol          = "HTTP"

  # Por defecto, si no coincide con API, manda al Frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
}

# --- 5A. Reglas de Ruteo API (Parte 1: Docs y Admin) ---
# Dividimos las reglas porque AWS solo permite 5 condiciones por regla
resource "aws_lb_listener_rule" "api_routing_part_1" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100 

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }

  condition {
    path_pattern {
      values = [
        "/docs*",       
        "/openapi.json",
        "/admin/*",     
        "/catalog/*"
      ]
    }
  }
}

# --- 5B. Reglas de Ruteo API (Parte 2: Negocio) ---
# El resto de las rutas de la API van aquí
resource "aws_lb_listener_rule" "api_routing_part_2" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 101 

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }

  condition {
    path_pattern {
      values = [
        "/patients/*",  
        "/trends/*",    
        "/lab/*"        
      ]
    }
  }
}

# --- 6. Output ---
output "alb_dns_name" {
  description = "La URL publica del Balanceador de Carga"
  value       = aws_lb.main_alb.dns_name
}