from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
from ..database import get_db_connection
from ..dependencies import get_current_user

router = APIRouter(tags=["Lab Operations"])

# Modelo de validación
class LabResultItem(BaseModel):
    patient_id: str
    test_code: str
    test_name: str
    value: float
    unit: str
    test_date: datetime # ✅ Acepta fechas pasadas

@router.post("/lab/upload-results")
def upload_lab_results(
    results: List[LabResultItem], 
    user: dict = Depends(get_current_user)
):
    # 1. Seguridad
    groups = user.get("cognito:groups", [])
    if "Labs" not in groups and "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo Labs.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 2. Inserción Masiva Optimizada
            query = """
                INSERT INTO lab_results (patient_id, test_code, test_name, value, unit, test_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            # Convertimos objetos a tuplas
            data_tuples = [
                (r.patient_id, r.test_code, r.test_name, r.value, r.unit, r.test_date) 
                for r in results
            ]
            
            cursor.executemany(query, data_tuples)
            conn.commit()
            
            return {"message": f"✅ Procesado: {len(results)} registros insertados."}
            
    except Exception as e:
        conn.rollback()
        print(f"Error Bulk Upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ... (imports anteriores se mantienen) ...
from datetime import date # Asegúrate de importar date

# --- NUEVO ENDPOINT PARA ELIMINAR ---
@router.delete("/lab/delete-results")
def delete_lab_results(
    patient_id: str,
    test_code: str,
    start_date: date,
    end_date: date,
    user: dict = Depends(get_current_user)
):
    # 1. Seguridad: Solo Labs o Admins
    groups = user.get("cognito:groups", [])
    if "Labs" not in groups and "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 2. Ejecutar borrado por rango
            # Usamos >= y <= para incluir los días seleccionados completos
            query = """
                DELETE FROM lab_results 
                WHERE patient_id = %s 
                AND test_code = %s 
                AND test_date::date >= %s 
                AND test_date::date <= %s
            """
            cursor.execute(query, (patient_id, test_code, start_date, end_date))
            deleted_count = cursor.rowcount # Obtenemos cuántos se borraron
            conn.commit()
            
            if deleted_count == 0:
                return {"message": "⚠️ No se encontraron registros en ese rango para borrar.", "count": 0}
            
            return {"message": f"✅ Se eliminaron {deleted_count} registros correctamente.", "count": deleted_count}

    except Exception as e:
        conn.rollback()
        print(f"Error Delete: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()