# --- 1. VPC Principal ---
# Crea la red virtual principal para el proyecto.
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16" # Rango de IP principal para toda la red
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "healthtrends-vpc"
  }
}

# --- 2. Gateways (Entradas/Salidas de Internet) ---

# Internet Gateway: Permite la comunicación entre la VPC y el internet.
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "healthtrends-igw"
  }
}

# NAT Gateway: Permite a las subredes privadas (app) acceder a internet
# sin exponerlas. Requiere una IP elástica (EIP).
resource "aws_eip" "nat_eip" {
  domain = "vpc"
  tags = {
    Name = "healthtrends-nat-eip"
  }
}

resource "aws_nat_gateway" "nat_gw" {
  # El NAT Gateway DEBE vivir en una subred PÚBLICA.
  subnet_id     = aws_subnet.public_a.id
  allocation_id = aws_eip.nat_eip.id

  tags = {
    Name = "healthtrends-nat-gw"
  }

  # Asegura que el IGW esté creado antes que el NAT GW
  depends_on = [aws_internet_gateway.igw]
}

# --- 3. Subredes ---
# Dividimos la VPC en 2 Zonas de Disponibilidad (AZs) para alta disponibilidad: a y b.

# -- Subredes Públicas (Para el Balanceador de Carga) --
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true # Asigna IP pública automáticamente

  tags = {
    Name = "healthtrends-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "healthtrends-public-b"
  }
}

# -- Subredes de Aplicación (Para ECS y Lambdas) --
resource "aws_subnet" "app_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = false # ¡PRIVADO!

  tags = {
    Name = "healthtrends-app-a"
  }
}

resource "aws_subnet" "app_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = false # ¡PRIVADO!

  tags = {
    Name = "healthtrends-app-b"
  }
}

# -- Subredes de Datos (Para la Base de Datos RDS) --
resource "aws_subnet" "data_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.20.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = false # ¡MUY PRIVADO!

  tags = {
    Name = "healthtrends-data-a"
  }
}

resource "aws_subnet" "data_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.21.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = false # ¡MUY PRIVADO!

  tags = {
    Name = "healthtrends-data-b"
  }
}

# --- 4. Tablas de Enrutamiento (Cómo viaja el tráfico) ---

# Tabla de rutas PÚBLICA: Envía todo el tráfico (0.0.0.0/0) al Internet Gateway.
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "healthtrends-public-rt"
  }
}

# Tabla de rutas PRIVADA (App): Envía todo el tráfico (0.0.0.0/0) al NAT Gateway.
resource "aws_route_table" "app_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw.id
  }

  tags = {
    Name = "healthtrends-app-rt"
  }
}

# Tabla de rutas de DATOS: ¡SIN RUTA A INTERNET!
# Por defecto, no tiene ruta a 0.0.0.0/0, por lo que está completamente aislada.
resource "aws_route_table" "data_rt" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "healthtrends-data-rt"
  }
}

# --- 5. Asociaciones de Rutas (Conectar subredes a tablas de rutas) ---

# Subredes públicas -> Tabla pública
resource "aws_route_table_association" "public_a_assoc" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "public_b_assoc" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public_rt.id
}

# Subredes de app -> Tabla de app (NAT)
resource "aws_route_table_association" "app_a_assoc" {
  subnet_id      = aws_subnet.app_a.id
  route_table_id = aws_route_table.app_rt.id
}
resource "aws_route_table_association" "app_b_assoc" {
  subnet_id      = aws_subnet.app_b.id
  route_table_id = aws_route_table.app_rt.id
}

# Subredes de datos -> Tabla de datos (Aislada)
resource "aws_route_table_association" "data_a_assoc" {
  subnet_id      = aws_subnet.data_a.id
  route_table_id = aws_route_table.data_rt.id
}
resource "aws_route_table_association" "data_b_assoc" {
  subnet_id      = aws_subnet.data_b.id
  route_table_id = aws_route_table.data_rt.id
}

#test for CI