from fastapi import Header, HTTPException
from jose import jwt, JWTError
import requests
from .config import JWKS_URL, APP_CLIENT_ID, COGNITO_REGION, USER_POOL_ID

async def get_current_user(authorization: str = Header(None)):
    if not authorization: raise HTTPException(status_code=401, detail="Falta header")
    token = authorization.replace("Bearer ", "")
    try:
        jwks = requests.get(JWKS_URL).json()
        header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == header["kid"]:
                rsa_key = {"kty": key["kty"], "kid": key["kid"], "use": key["use"], "n": key["n"], "e": key["e"]}
        if not rsa_key: raise HTTPException(status_code=401, detail="Llave no encontrada")
        
        payload = jwt.decode(token, rsa_key, algorithms=["RS256"], audience=APP_CLIENT_ID, issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}")
        return payload 
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")