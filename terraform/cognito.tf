# --- 1. User Pool (Directorio de Usuarios) ---
resource "aws_cognito_user_pool" "user_pool" {
  name = "healthtrends-user-pool"

  # Usamos email como nombre de usuario
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Atributo personalizado 'patient_id'
  schema {
    name                = "patient_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  # Configuración de Trigger Lambda (Post-Confirmation)
  lambda_config {
    post_confirmation = aws_lambda_function.post_confirmation_trigger.arn
  }

  tags = {
    Name = "healthtrends-user-pool"
  }
}

# --- 2. Cliente de la App (Para React) ---
resource "aws_cognito_user_pool_client" "app_client" {
  name = "healthtrends-app-client"

  user_pool_id = aws_cognito_user_pool.user_pool.id
  
  # Importante para React: No generar secreto
  generate_secret = false

  # Flujos de autenticación permitidos
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

# --- 3. Grupos de Usuarios (Roles) ---

# Grupo: Laboratorios (Quienes suben datos)
resource "aws_cognito_user_group" "labs_group" {
  name         = "Labs"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  description  = "Personal autorizado para subir resultados via API"
  precedence   = 1
}

# Grupo: Doctores (Quienes ven todo)
resource "aws_cognito_user_group" "doctors_group" {
  name         = "Doctors"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  description  = "Médicos con acceso a búsqueda global"
  precedence   = 2
}

# Grupo: Pacientes (Quienes solo ven lo suyo)
resource "aws_cognito_user_group" "patients_group" {
  name         = "Patients"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  description  = "Pacientes con acceso de solo lectura a sus propios datos"
  precedence   = 3
}

# Grupo: Administradores (Gestión de roles)
resource "aws_cognito_user_group" "admins_group" {
  name         = "Admins"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  description  = "Administradores del sistema con capacidad de asignar roles"
  precedence   = 0 # La prioridad más alta
}

# --- Outputs ---
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.user_pool.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.app_client.id
}