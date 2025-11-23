import os

COGNITO_REGION = "us-east-1"
USER_POOL_ID = os.environ.get("USER_POOL_ID") 
APP_CLIENT_ID = os.environ.get("APP_CLIENT_ID")
JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

DB_SECRET_ARN = os.environ.get("DB_SECRET_ARN")
DB_HOST = os.environ.get("DB_HOST")
DB_NAME = "postgres"
DB_USER = "postgres"