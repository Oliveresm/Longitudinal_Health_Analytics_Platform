# --- 1. Tabla de DynamoDB para el Dashboard ---
# Almacena SÓLO el estado más reciente del paciente.
# Rápido, barato y perfecto para la vista principal de la UI.
resource "aws_dynamodb_table" "dashboard_table" {
  name         = "healthtrends-dashboard"
  billing_mode = "PAY_PER_REQUEST" # Modo On-demand, sin costo si no se usa
  hash_key     = "patient_id"      # Clave de partición

  # Definimos la clave de partición
  attribute {
    name = "patient_id"
    type = "S" # S = String
  }

  tags = {
    Name = "healthtrends-dashboard-table"
  }
}

# --- 2. Outputs ---
output "dynamodb_dashboard_table_name" {
  description = "El nombre de la tabla de DynamoDB para el dashboard"
  value       = aws_dynamodb_table.dashboard_table.name
}

output "dynamodb_dashboard_table_arn" {
  description = "El ARN de la tabla de DynamoDB para el dashboard"
  value       = aws_dynamodb_table.dashboard_table.arn
}