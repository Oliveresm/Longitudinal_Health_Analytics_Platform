# --- 1. Grupo de Subredes de la BD ---
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "healthtrends-db-subnet-group"
  subnet_ids = [aws_subnet.data_a.id, aws_subnet.data_b.id]

  tags = {
    Name = "healthtrends-db-subnet-group"
  }
}

# --- 2. Grupo de Seguridad de la BD ---
resource "aws_security_group" "rds_sg" {
  name        = "healthtrends-rds-sg"
  description = "Permite el trafico a la instancia RDS"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "healthtrends-rds-sg"
  }
}

# --- 3. Instancia de la Base de Datos (RDS PostgreSQL) ---
resource "aws_db_instance" "main_db" {
  identifier           = "healthtrends-db-instance"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15"
  
  # Credenciales
  username             = "postgres"
  password             = random_password.db_password.result
  
  # Redes
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false

  # Mantenimiento
  skip_final_snapshot    = true
  backup_retention_period = 0   

  tags = {
    Name = "healthtrends-db-instance"
  }
}

# --- 4. AWS Secrets Manager ---
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password_secret" {
  name = "healthtrends/db_password-v4"
  
  description = "Contrasena para la base de datos RDS de HealthTrends"

  recovery_window_in_days = 0
}
resource "aws_secretsmanager_secret_version" "db_password_version" {
  secret_id     = aws_secretsmanager_secret.db_password_secret.id
  secret_string = random_password.db_password.result
}

# --- 5. Outputs ---
output "db_instance_address" {
  value = aws_db_instance.main_db.address
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password_secret.arn
}