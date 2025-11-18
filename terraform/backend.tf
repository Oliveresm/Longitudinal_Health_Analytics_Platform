# Configuración del backend remoto para el estado de Terraform
terraform {
  backend "s3" {
    # REEMPLAZA ESTO con el nombre único de tu bucket
    bucket = "healthtrends-tf-state-tup-99887"

    # Ruta donde se guardará el archivo de estado dentro del bucket
    key    = "global/terraform.tfstate"

    # REEMPLAZA ESTO con la región donde creaste tus recursos
    region = "us-east-1"

    # REEMPLAZA ESTO con el nombre de tu tabla de DynamoDB
    dynamodb_table = "healthtrends-tf-lock"

    # Habilita el cifrado del lado del servidor para el archivo de estado
    encrypt = true
  }
}