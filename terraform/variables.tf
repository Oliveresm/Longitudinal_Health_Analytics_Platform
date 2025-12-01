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