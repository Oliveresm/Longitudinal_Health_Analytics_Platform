# Define el proveedor de AWS y la región principal
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # Fija una versión mayor para evitar cambios inesperados que rompan tu código
      version = "~> 5.0"
    }
  }
}

# Configura la región de AWS para este proyecto
provider "aws" {
  region = var.aws_region
}
# Forzando el despliegue del CI/CD5
