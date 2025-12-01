# Variable para la región de AWS
variable "aws_region" {
  description = "La región de AWS donde se desplegarán los recursos."
  type        = string
  default     = "us-east-1" # O la región que prefieras
}

# Archivo: variables.tf

variable "environment" {
  description = "El ambiente de despliegue (ej: dev, staging, prod)."
  type        = string
  # Puedes establecer un valor por defecto si no quieres pasarlo por línea de comandos
  default     = "dev" 
}

# Agrega esto a variables.tf
variable "allowed_ips" {
  description = "Lista de IPs permitidas para acceder al Frontend (formato CIDR)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # CAMBIA ESTO por tu IP pública, ej: ["201.123.45.67/32"]
}