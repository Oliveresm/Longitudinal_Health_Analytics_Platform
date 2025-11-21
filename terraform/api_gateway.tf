# --- 1. La API Gateway (El contenedor) ---
resource "aws_api_gateway_rest_api" "api" {
  name        = "healthtrends-api"
  description = "API para la plataforma HealthTrends"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# --- 2. El Autorizador de Cognito (DESACTIVADO POR AHORA) ---
# Lo dejamos aquí por si quieres activarlo después, pero el método no lo usa.
resource "aws_api_gateway_authorizer" "cognito_auth" {
  name            = "healthtrends-cognito-authorizer"
  type            = "COGNITO_USER_POOLS"
  rest_api_id     = aws_api_gateway_rest_api.api.id
  provider_arns   = [aws_cognito_user_pool.user_pool.arn]
  identity_source = "method.request.header.Authorization"
}

# --- 3. El Recurso (La "ruta" /ingest) ---
resource "aws_api_gateway_resource" "ingest_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "ingest"
}

# --- 4. El Método POST (Con Auth DESACTIVADO) ---
resource "aws_api_gateway_method" "ingest_method_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.ingest_resource.id
  http_method   = "POST"
  
  # CAMBIO: Seguridad desactivada para pruebas
  authorization = "NONE" 
}

# --- 5. La Integración (Conectar POST a Lambda) ---
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.ingest_resource.id
  http_method             = aws_api_gateway_method.ingest_method_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.ingest_lambda.invoke_arn
}

# --- 6. Permiso de API Gateway ---
resource "aws_lambda_permission" "api_gateway_permission" {
  statement_id  = "AllowAPIGatewayToInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# =================================================================
# CONFIGURACIÓN DE CORS (OPTIONS)
# =================================================================

# 7. Método OPTIONS
resource "aws_api_gateway_method" "ingest_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.ingest_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# 8. Respuesta Mock para OPTIONS
resource "aws_api_gateway_integration" "ingest_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.ingest_resource.id
  http_method = aws_api_gateway_method.ingest_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# 9. Headers de Respuesta (Definición)
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

# 10. Headers de Respuesta (Valores)
resource "aws_api_gateway_integration_response" "ingest_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.ingest_resource.id
  http_method = aws_api_gateway_method.ingest_options.http_method
  status_code = aws_api_gateway_method_response.ingest_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_method_response.ingest_options_response]
}

# --- 11. Despliegue ---
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.ingest_resource.id,
      aws_api_gateway_method.ingest_method_post.id,
      aws_api_gateway_integration.lambda_integration.id,
      aws_api_gateway_method.ingest_options.id,
      aws_api_gateway_integration.ingest_options_integration.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- 12. Stage ---
resource "aws_api_gateway_stage" "prod_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "prod"
}

# --- 13. Output ---
output "api_gateway_invoke_url" {
  value = aws_api_gateway_stage.prod_stage.invoke_url
}