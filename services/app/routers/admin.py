from fastapi import APIRouter, Depends, HTTPException
import boto3
from ..dependencies import get_current_user
from ..models import RoleRequest
from ..config import USER_POOL_ID, COGNITO_REGION

router = APIRouter(tags=["Admin"])
cognito_client = boto3.client("cognito-idp", region_name=COGNITO_REGION)

# ✅ ESTA RUTA ES CORRECTA
# En main.py tienes: app.include_router(admin.router, prefix="/admin")
# Aquí pones: "/assign-role"
# Resultado final: TU_API.com/admin/assign-role
@router.post("/assign-role")
def assign_role(request: RoleRequest, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    
    # 1. Validación de seguridad
    if "Admins" not in groups: 
        raise HTTPException(status_code=403, detail="Solo Admins.")
    
    try:
        # 2. Buscar usuario en Cognito por email
        response = cognito_client.list_users(
            UserPoolId=USER_POOL_ID, 
            Filter=f'email = "{request.email}"', 
            Limit=1
        )
        
        if not response['Users']: 
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
            
        # 3. Asignar el grupo al usuario encontrado
        cognito_client.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID, 
            Username=response['Users'][0]['Username'], 
            GroupName=request.role
        )
        
        return {"message": "Rol asignado"}
        
    except Exception as e: 
        # Captura errores de Cognito (ej. grupo no existe)
        raise HTTPException(status_code=500, detail=str(e))