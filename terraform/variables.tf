# Variable para la región de AWS
variable "aws_region" {
  description = "La región de AWS donde se desplegarán los recursos."
  type        = string
  default     = "us-east-1" # O la región que prefieras
}