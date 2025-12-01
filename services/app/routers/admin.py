from fastapi import APIRouter, Depends, HTTPException
import boto3
from psycopg2.extras import RealDictCursor
from ..dependencies import get_current_user
from ..database import get_db_connection
from ..models import RoleRequest
from ..config import USER_POOL_ID, COGNITO_REGION

router = APIRouter(tags=["Admin"])
cognito_client = boto3.client("cognito-idp", region_name=COGNITO_REGION)

# 1. Asignar Rol (Igual)
# services/app/routers/admin.py

@router.post("/assign-role")
def assign_role(request: RoleRequest, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Solo Admins.")

    try:
        # 1. Buscar el Username basado en el Email
        response = cognito_client.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'email = "{request.email}"',
            Limit=1
        )
        if not response['Users']:
            raise HTTPException(status_code=404, detail="Usuario no encontrado en Cognito.")
        
        target_username = response['Users'][0]['Username']

        # 2. LIMPIEZA: Obtener grupos actuales del usuario
        current_groups_response = cognito_client.admin_list_groups_for_user(
            UserPoolId=USER_POOL_ID,
            Username=target_username
        )
        
        # 3. Remover usuario de TODOS los grupos actuales
        # Esto evita que sea "Patient" y "Doctor" al mismo tiempo
        for group in current_groups_response.get('Groups', []):
            old_role = group['GroupName']
            # Opcional: No te borres a ti mismo de Admin si estás editando tu propio usuario por error
            if old_role != request.role: 
                print(f"🧹 Removiendo rol antiguo: {old_role}")
                cognito_client.admin_remove_user_from_group(
                    UserPoolId=USER_POOL_ID,
                    Username=target_username,
                    GroupName=old_role
                )

        # 4. Asignar el NUEVO rol
        print(f"✅ Asignando nuevo rol: {request.role}")
        cognito_client.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=target_username,
            GroupName=request.role
        )

        return {"message": f"Rol actualizado correctamente a {request.role}"}

    except Exception as e:
        print(f"Error cambiando rol: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ 2. LISTAR TODO (INCLUYENDO FANTASMAS)
@router.get("/users")
def list_users(user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Solo Admins.")
    
    conn = get_db_connection()
    try:
        # A. Traemos de Cognito
        cog_users = {}
        try:
            response = cognito_client.list_users(UserPoolId=USER_POOL_ID, Limit=60)
            for u in response['Users']:
                email = next((attr['Value'] for attr in u['Attributes'] if attr['Name'] == 'email'), None)
                if email: cog_users[email] = u['UserStatus']
        except: pass

        # B. SQL PODEROSA: Perfiles + IDs Huérfanos en Resultados
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Esta query une los perfiles oficiales con los IDs que solo existen en resultados
            query = """
                SELECT patient_id, email, full_name, 'PROFILE' as type FROM patient_profiles
                UNION
                SELECT DISTINCT patient_id, 'N/A' as email, 'Datos Huérfanos' as full_name, 'GHOST' as type 
                FROM lab_results 
                WHERE patient_id NOT IN (SELECT patient_id FROM patient_profiles)
            """
            cursor.execute(query)
            db_records = cursor.fetchall()

        combined_list = []
        processed_emails = set()

        # 1. Procesar registros de DB (Perfiles y Fantasmas)
        for r in db_records:
            email = r['email']
            p_id = r['patient_id']
            
            if r['type'] == 'GHOST':
                status = "👻 FANTASMA (Solo Datos)"
                source = "GHOST"
            else:
                cog_status = cog_users.get(email)
                status = f"✅ Cognito ({cog_status})" if cog_status else "⚠️ Solo DB (Perfil Huérfano)"
                source = "DB_ONLY" if not cog_status else "LINKED"
                processed_emails.add(email)

            combined_list.append({
                "identifier": email if email != 'N/A' else p_id, # Usamos ID si no hay email
                "name": r['full_name'],
                "extra_info": p_id,
                "source": source,
                "status": status
            })

        # 2. Agregar usuarios Solo Cognito (Admins, Staff sin perfil)
        for email, status in cog_users.items():
            if email not in processed_emails:
                combined_list.append({
                    "identifier": email,
                    "name": "Usuario Sistema",
                    "extra_info": "Sin Perfil Médico",
                    "source": "COGNITO_ONLY",
                    "status": f"☁️ Solo Cognito ({status})"
                })

        return combined_list

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ✅ 3. ELIMINAR INTELIGENTE (Detecta si es Email o ID)
@router.delete("/users/{identifier}")
def delete_user(identifier: str, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Solo Admins.")

    messages = []
    conn = get_db_connection()
    
    try:
        # A. Intentar borrar de Cognito (Si parece un email)
        if "@" in identifier:
            try:
                response = cognito_client.list_users(UserPoolId=USER_POOL_ID, Filter=f'email = "{identifier}"', Limit=1)
                if response['Users']:
                    cognito_client.admin_delete_user(UserPoolId=USER_POOL_ID, Username=response['Users'][0]['Username'])
                    messages.append("Cognito eliminado")
            except: pass

        # B. Borrar de Base de Datos (Buscando por Email O por ID)
        with conn.cursor() as cursor:
            # 1. Borrar resultados (buscando el ID asociado si es email, o el ID directo)
            cursor.execute("""
                DELETE FROM lab_results 
                WHERE patient_id = %s OR patient_id = (SELECT patient_id FROM patient_profiles WHERE email = %s)
            """, (identifier, identifier))
            res_count = cursor.rowcount
            
            # 2. Borrar perfil
            cursor.execute("DELETE FROM patient_profiles WHERE email = %s OR patient_id = %s", (identifier, identifier))
            prof_count = cursor.rowcount
            
            if res_count > 0 or prof_count > 0:
                messages.append(f"DB: {prof_count} perfil y {res_count} resultados eliminados")
            else:
                messages.append("DB limpia")

            conn.commit()

        return {"message": " | ".join(messages)}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()