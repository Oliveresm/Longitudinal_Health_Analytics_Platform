# --- 1. La API Gateway (El contenedor) ---
resource "aws_api_gateway_rest_api" "api" {
  name        = "healthtrends-api"
  description = "API para la plataforma HealthTrends"

  # Define un endpoint regional
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# --- 2. El Autorizador de Cognito ---
# Esto conecta nuestra API con el User Pool de Cognito
resource "aws_api_gateway_authorizer" "cognito_auth" {
  name                   = "healthtrends-cognito-authorizer"
  type                   = "COGNITO_USER_POOLS"
  rest_api_id            = aws_api_gateway_rest_api.api.id
  
  # Le dice al autorizador qué User Pool debe usar
  provider_arns          = [aws_cognito_user_pool.user_pool.arn]
  
  # Le dice a la API que busque el Token de autenticación en el header 'Authorization'
  identity_source        = "method.request.header.Authorization"
}

# --- 3. El Recurso (La "ruta" /ingest) ---
resource "aws_api_gateway_resource" "ingest_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id # Se cuelga de la raíz (/)
  path_part   = "ingest"                                    # Crea la ruta /ingest
}

# --- 4. El Método (El verbo POST) ---
resource "aws_api_gateway_method" "ingest_method_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.ingest_resource.id
  http_method   = "POST"
  
  # ¡IMPORTANTE! Requiere autorización
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id
}

# --- 5. La Integración (Conectar POST a Lambda) ---
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.ingest_resource.id
  http_method             = aws_api_gateway_method.ingest_method_post.http_method
  
  integration_http_method = "POST" # La Lambda se invoca con POST
  type                    = "AWS_PROXY" # Tipo de integración estándar para Lambda
  
  # El ARN (nombre único) de la Lambda que queremos disparar
  uri = aws_lambda_function.ingest_lambda.invoke_arn
}

# --- 6. Permiso de API Gateway ---
# Debemos darle permiso explícito a API Gateway para invocar nuestra Lambda
resource "aws_lambda_permission" "api_gateway_permission" {
  statement_id  = "AllowAPIGatewayToInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # Limita el permiso solo a ESTA API Gateway específica
  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# --- 7. Despliegue (¡El paso que todos olvidan!) ---
# Los cambios en API Gateway no están "en vivo" hasta que creas un despliegue
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.ingest_resource.id,
      aws_api_gateway_method.ingest_method_post.id,
      aws_api_gateway_integration.lambda_integration.id,
      
      # --- AÑADE ESTA LÍNEA: ---
      aws_api_gateway_method.ingest_options.id 
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- 8. El "Stage" (La URL pública, ej. /prod) ---
resource "aws_api_gateway_stage" "prod_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "prod" # La URL será .../prod/ingest
}

# --- 9. Output ---
output "api_gateway_invoke_url" {
  description = "La URL base para invocar la API"
  value       = aws_api_gateway_stage.prod_stage.invoke_url
}



# =================================================================
# CONFIGURACIÓN DE CORS (Para que funcione desde React/Localhost)
# =================================================================

# --- 4. El Método (El verbo POST) ---
resource "aws_api_gateway_method" "ingest_method_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.ingest_resource.id
  http_method   = "POST"
  
  # CAMBIO TEMPORAL: Quitamos la seguridad para probar desde localhost sin login
  authorization = "NONE" 
  # authorizer_id = aws_api_gateway_authorizer.cognito_auth.id  <-- Comenta o borra esta línea
}

# 2. Respuesta Mock (API Gateway responde directamente, sin llamar a Lambda)
resource "aws_api_gateway_integration" "ingest_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.ingest_resource.id
  http_method = aws_api_gateway_method.ingest_options.http_method
  type        = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 3. Definir qué headers devolvemos (Configuración)
resource "aws_api_gateway_method_response" "ingest_options_response" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.ingest_resource.id
  http_method = aws_api_gateway_method.ingest_options.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# 4. Definir los VALORES de esos headers
resource "aws_api_gateway_integration_response" "ingest_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.ingest_resource.id
  http_method = aws_api_gateway_method.ingest_options.http_method
  status_code = aws_api_gateway_method_response.ingest_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'" # Permitir a todo el mundo (localhost incluido)
  }

  depends_on = [aws_api_gateway_method_response.ingest_options_response]
}