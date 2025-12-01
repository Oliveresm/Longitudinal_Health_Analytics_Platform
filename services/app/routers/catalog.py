from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from ..database import get_db_connection
from ..dependencies import get_current_user
from ..models import TestTypeRequest

router = APIRouter(tags=["Catalog"])

@router.get("/tests")
def list_test_catalog(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM test_types ORDER BY name")
            return cursor.fetchall()
    finally:
        conn.close()

@router.post("/tests")
def create_test_type(test: TestTypeRequest, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    
    # SOLO ADMINS pueden crear nuevos tipos de pruebas
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo Administradores pueden crear pruebas.")
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = "INSERT INTO test_types (code, name, unit) VALUES (%s, %s, %s) ON CONFLICT (code) DO NOTHING"
            cursor.execute(sql, (test.code.upper(), test.name, test.unit))
            conn.commit()
            return {"message": "Examen creado exitosamente."}
    finally:
        conn.close()

@router.delete("/tests/{code}")
def delete_test_type(code: str, cascade: bool = False, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Solo Admins.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. VERIFICACIÓN MANUAL DE DATOS ASOCIADOS
            cursor.execute("SELECT COUNT(*) FROM lab_results WHERE test_code = %s", (code,))
            count = cursor.fetchone()[0]

            # 2. Si hay datos y NO pidieron cascada, bloqueamos el borrado
            if count > 0 and not cascade:
                raise HTTPException(
                    status_code=409, 
                    detail=f"CONFLICTO: Existen {count} resultados de pacientes con este examen. Debes forzar el borrado para eliminarlos también."
                )

            # 3. Si hay datos y SÍ pidieron cascada, borramos los resultados primero
            deleted_results = 0
            if count > 0 and cascade:
                cursor.execute("DELETE FROM lab_results WHERE test_code = %s", (code,))
                deleted_results = cursor.rowcount

            # 4. Finalmente borramos el tipo de examen del catálogo
            cursor.execute("DELETE FROM test_types WHERE code = %s", (code,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Examen no encontrado.")
            
            conn.commit()
            
            msg = f"Examen {code} eliminado correctamente."
            if deleted_results > 0:
                msg += f" (Se eliminaron también {deleted_results} resultados históricos)."
            
            return {"message": msg}

    except HTTPException as he:
        raise he # Re-lanzar excepciones HTTP controladas
    except Exception as e:
        conn.rollback()
        print(f"Error Delete: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ... (Mantén tus imports anteriores) ...

# ✅ NUEVO ENDPOINT DE SINCRONIZACIÓN
@router.post("/tests/sync")
def sync_catalog_with_results(user: dict = Depends(get_current_user)):
    # 1. Seguridad: Solo Admins
    groups = user.get("cognito:groups", [])
    if "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Solo Admins.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 2. Buscar códigos que están en RESULTADOS pero NO en CATÁLOGO
            cursor.execute("""
                SELECT DISTINCT r.test_code, r.test_name, r.unit 
                FROM lab_results r
                LEFT JOIN test_types t ON r.test_code = t.code
                WHERE t.code IS NULL
            """)
            orphans = cursor.fetchall()
            
            count = 0
            for row in orphans:
                # row es una tupla: (code, name, unit)
                cursor.execute("""
                    INSERT INTO test_types (code, name, unit) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (code) DO NOTHING
                """, (row[0], row[1], row[2] or "N/A"))
                count += 1
            
            conn.commit()
            
            if count == 0:
                return {"message": "✅ El catálogo ya está sincronizado."}
            
            return {"message": f"🎉 Se recuperaron {count} exámenes faltantes al catálogo."}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()