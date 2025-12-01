# Archivo: ses.tf
# Propósito: Define la identidad de correo electrónico de AWS Simple Email Service (SES)
#            para poder enviar alertas desde la aplicación Fast API.

# 1. Identidad de Correo Electrónico Verificada
# AWS enviará un enlace de verificación a esta dirección inmediatamente después de 'terraform apply'.
# La verificación debe ser completada manualmente haciendo clic en el enlace.
resource "aws_ses_email_identity" "sender_email_identity" {
  email = "mycodestage@gmail.com"
}

# 2. (Opcional) Salida para Referencia
# Exporta el ARN de la identidad, que puede ser útil para referencias en otros archivos 
# (aunque usaremos el recurso directamente en 'iam.tf').
output "ses_sender_email_arn" {
  description = "El ARN de la identidad de correo verificada de SES (mycodestage@gmail.com)"
  value       = aws_ses_email_identity.sender_email_identity.arn
}

# NOTA IMPORTANTE:
# Recuerda que después de ejecutar 'terraform apply', DEBES revisar la bandeja de 
# entrada de mycodestage@gmail.com y hacer clic en el enlace de verificación de AWS.
# Sin ese paso manual, la aplicación no podrá enviar correos.