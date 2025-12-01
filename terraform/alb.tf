# --- 1. El Balanceador de Carga (ALB) ---
# Mantenemos el mismo recurso para no cambiar la DNS
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

# --- 2. Grupo de Seguridad del ALB (ACTUALIZADO CON SEGURIDAD) ---
resource "aws_security_group" "alb_sg" {
  name        = "healthtrends-alb-sg"
  description = "Security Group del ALB con Whitelist de IPs"
  vpc_id      = aws_vpc.main.id

  # ✅ CAMBIO CLAVE DE SEGURIDAD:
  # Solo permite tráfico HTTP (80) desde las IPs definidas en variables.tf
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_ips 
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

# --- 3A. Target Group para el BACKEND (API) ---
# Este es el que ya tenías, lo renombramos a 'backend_tg' para claridad
# pero mantenemos la lógica de health check de la API.
resource "aws_lb_target_group" "backend_tg" {
  name        = "healthtrends-backend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" 

  health_check {
    path = "/" # Ruta raíz de FastAPI
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# --- 3B. Target Group para el FRONTEND (React) ---
# NUEVO: Este TG apuntará al contenedor de Nginx/React
resource "aws_lb_target_group" "frontend_tg" {
  name        = "healthtrends-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" 

  health_check {
    path                = "/" # Nginx sirve index.html en raíz
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# --- 4. Listener Principal (Regla por Defecto) ---
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main_alb.arn
  port              = "80"
  protocol          = "HTTP"

  # ✅ POR DEFECTO: Mandar al FRONTEND
  # Si alguien entra a la raíz (healthtrends.com/), va a React.
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
}

# --- 5. Reglas de Ruteo (Path-Based Routing) ---
# ✅ REGLA: Si la URL empieza con rutas de API, mandar al BACKEND
resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100 # Prioridad alta

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }

  condition {
    path_pattern {
      # Lista de rutas que pertenecen exclusivamente a FastAPI
      values = [
        "/docs*",       # Swagger UI
        "/openapi.json",# Swagger JSON
        "/admin/*",     # Rutas de admin
        "/catalog/*",   # Rutas de catálogo
        "/patients/*",  # Rutas de pacientes
        "/trends/*",    # Rutas de tendencias
        "/lab/*"        # Rutas de laboratorio
      ]
    }
  }
}

# --- 6. Output ---
output "alb_dns_name" {
  description = "La URL publica del Balanceador de Carga"
  value       = aws_lb.main_alb.dns_name
}