# --- 1. Repositorio ECR para el "Processor" ---
# ECR (Elastic Container Registry) es el Docker Hub privado de AWS.
resource "aws_ecr_repository" "processor_repo" {
  name = "healthtrends/processor"

  # Fuerza la eliminación aunque haya imágenes (para desarrollo)
  force_delete = true

  tags = {
    Name = "healthtrends-processor-repo"
  }
}

# --- 2. Outputs ---
output "ecr_processor_repo_url" {
  description = "La URL del repositorio ECR del Processor"
  value       = aws_ecr_repository.processor_repo.repository_url
}