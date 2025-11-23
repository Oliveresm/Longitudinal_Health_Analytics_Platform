from fastapi import APIRouter, Depends, HTTPException
import boto3
from ..dependencies import get_current_user
from ..models import RoleRequest
from ..config import USER_POOL_ID, COGNITO_REGION

router = APIRouter(tags=["Admin"])
cognito_client = boto3.client("cognito-idp", region_name=COGNITO_REGION)

@router.post("/admin/assign-role")
def assign_role(request: RoleRequest, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups: raise HTTPException(status_code=403, detail="Solo Admins.")
    try:
        response = cognito_client.list_users(UserPoolId=USER_POOL_ID, Filter=f'email = "{request.email}"', Limit=1)
        if not response['Users']: raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        cognito_client.admin_add_user_to_group(UserPoolId=USER_POOL_ID, Username=response['Users'][0]['Username'], GroupName=request.role)
        return {"message": "Rol asignado"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))