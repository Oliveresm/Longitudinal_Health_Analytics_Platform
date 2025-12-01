# --- 1. Repositorio ECR para el "Processor" (Worker) ---
resource "aws_ecr_repository" "processor_repo" {
  name = "healthtrends/processor"
  force_delete = true

  tags = {
    Name = "healthtrends-processor-repo"
  }
}

output "ecr_processor_repo_url" {
  description = "La URL del repositorio ECR del Processor"
  value       = aws_ecr_repository.processor_repo.repository_url
}

# --- 2. Repositorio ECR para el "Portal" (API) ---
# ESTA ES LA PARTE QUE TE FALTABA
resource "aws_ecr_repository" "portal_repo" {
  name = "healthtrends/portal"
  force_delete = true

  tags = {
    Name = "healthtrends-portal-repo"
  }
}

output "ecr_portal_repo_url" {
  value = aws_ecr_repository.portal_repo.repository_url
}


resource "aws_ecr_repository" "frontend_repo" {
  name = "healthtrends-frontend"
  force_delete = true
}