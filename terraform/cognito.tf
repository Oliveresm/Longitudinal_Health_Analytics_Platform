# --- 1. User Pool (El directorio de usuarios) ---
# Aquí es donde se almacenarán las cuentas de los médicos.
resource "aws_cognito_user_pool" "user_pool" {
  name = "healthtrends-user-pool"

  # Configura cómo se registrarán los usuarios. Usaremos email como nombre de usuario.
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]

  # Define la política de contraseñas
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  tags = {
    Name = "healthtrends-user-pool"
  }
}

# --- 2. User Pool Client (La "App" que se conecta) ---
# Esto es lo que nuestra API y frontend usarán para hablar con Cognito.
resource "aws_cognito_user_pool_client" "app_client" {
  name = "healthtrends-app-client"

  user_pool_id = aws_cognito_user_pool.user_pool.id

  # Evita que el cliente genere un "secreto".
  # Útil para aplicaciones de frontend (JavaScript).
  generate_secret = false

  # Define los métodos de autenticación permitidos
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# --- 3. Outputs (Opcional pero recomendado) ---
# Exporta los IDs para que otros servicios (como API Gateway) puedan usarlos.
output "cognito_user_pool_id" {
  description = "El ID del User Pool de Cognito"
  value       = aws_cognito_user_pool.user_pool.id
}

output "cognito_app_client_id" {
  description = "El ID del App Client de Cognito"
  value       = aws_cognito_user_pool_client.app_client.id
}