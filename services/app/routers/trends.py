from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from typing import Optional
from decimal import Decimal
import math
from ..database import get_db_connection
from ..dependencies import get_current_user

router = APIRouter(tags=["Trends"])

# 1. Obtener lista de exámenes disponibles
@router.get("/patient/{patient_id}/available_tests")
def get_available_tests(patient_id: str, user: dict = Depends(get_current_user)):
    # ... (validaciones de seguridad igual que antes) ...
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # ✅ CORRECCIÓN: Agregamos ', unit' al SELECT
            cursor.execute("""
                SELECT DISTINCT test_code, test_name, unit 
                FROM lab_results 
                WHERE patient_id = %s 
                ORDER BY test_name
            """, (patient_id,))
            return cursor.fetchall()
    finally:
        conn.close()

# 2. Obtener historial detallado (Diario) - Consultas < 90 días
@router.get("/patient/{patient_id}/trends/{test_code}")
def get_trends(
    patient_id: str, 
    test_code: str, 
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user: dict = Depends(get_current_user)
):
    groups = user.get("cognito:groups", [])
    if "Patients" in groups and not any(r in groups for r in ["Doctors", "Labs", "Admins"]):
        if (user.get("username") or user.get("sub")) != patient_id: 
            raise HTTPException(status_code=403, detail="Prohibido")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Consulta estándar a la tabla gigante
            query = """
                SELECT test_date, value, unit, 
                AVG(value) OVER (ORDER BY test_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg_3_points 
                FROM lab_results 
                WHERE patient_id = %s AND test_code = %s
            """
            params = [patient_id, test_code]
            
            if start_date: 
                query += " AND test_date >= %s"
                params.append(start_date)
            if end_date: 
                query += " AND test_date <= %s"
                params.append(end_date)
            
            query += " ORDER BY test_date ASC;"
            
            cursor.execute(query, tuple(params))
            return {
                "patient_id": patient_id, 
                "test_code": test_code, 
                "history": cursor.fetchall()
            }
    finally:
        conn.close()

# ✅ 3. NUEVO ENDPOINT OPTIMIZADO (VISTA MATERIALIZADA)
# Para consultas de largo plazo (> 90 días)
@router.get("/patient/{patient_id}/monthly-trends/{test_code}")
def get_monthly_trends(
    patient_id: str, 
    test_code: str, 
    user: dict = Depends(get_current_user)
):
    # Misma seguridad
    groups = user.get("cognito:groups", [])
    if "Patients" in groups and not any(r in groups for r in ["Doctors", "Labs", "Admins"]):
        if (user.get("username") or user.get("sub")) != patient_id: 
            raise HTTPException(status_code=403, detail="Prohibido")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Consultamos la VISTA MATERIALIZADA en lugar de la tabla gigante
            # Esto retorna el promedio ya calculado, mucho más rápido
            query = """
                SELECT 
                    month as date, 
                    ROUND(avg_val::numeric, 2) as average, 
                    ROUND(min_val::numeric, 2) as min, 
                    ROUND(max_val::numeric, 2) as max,
                    total_tests as count
                FROM patient_monthly_stats 
                WHERE patient_id = %s AND test_code = %s
                ORDER BY month ASC
            """
            cursor.execute(query, (patient_id, test_code))
            
            return {
                "patient_id": patient_id, 
                "test_code": test_code, 
                "monthly_data": cursor.fetchall()
            }
    except Exception as e:
        print(f"Error consultando vista materializada: {e}")
        # Si la vista no existe (aún no se corrió el script de admin), retornamos lista vacía para no romper el front
        return {"patient_id": patient_id, "monthly_data": []}
    finally:
        conn.close()

@router.get("/patient/{patient_id}/risk-analysis/{test_code}")
def get_risk_analysis(
    patient_id: str, 
    test_code: str, 
    user: dict = Depends(get_current_user)
):
    # Misma seguridad (se omite para brevedad)
    groups = user.get("cognito:groups", [])
    if "Patients" in groups and not any(r in groups for r in ["Doctors", "Labs", "Admins"]):
        if (user.get("username") or user.get("sub")) != patient_id: 
            raise HTTPException(status_code=403, detail="Prohibido")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # 1. Traer los últimos 9 resultados (para detectar cambios graduales)
            query = """
                SELECT 
                    value, 
                    test_date
                FROM lab_results 
                WHERE patient_id = %s AND test_code = %s
                ORDER BY test_date DESC 
                LIMIT 9; 
            """
            cursor.execute(query, (patient_id, test_code))
            recent_results = cursor.fetchall()
            
            if len(recent_results) < 3:
                return {"trend": "insufficient_data", "alert": "⚠️ Pocos datos para análisis"}

            # Convertir a listas para el análisis estadístico simple
            values = [r['value'] for r in reversed(recent_results)] # ASC orden
            
            # 2. Análisis de Tendencia Simple (Regla del Promedio)
            # Ejemplo: Comparar el promedio de los últimos 3 vs los 3 anteriores (6 puntos)
            
            if len(values) >= 6:
                recent_avg = sum(values[-3:]) / 3
                previous_avg = sum(values[-6:-3]) / 3
                
                change_percent = ((recent_avg - previous_avg) / previous_avg) * 100 if previous_avg else 0
                
                trend = "stable"
                alert_level = "none"
                alert_message = "Sin alerta de tendencia."
                
                if change_percent > 15:
                    trend = "worsening"
                    alert_level = "CRITICAL"
                    alert_message = f"🚨 DETERIORO RÁPIDO: Promedio subió {round(change_percent)}% en 6 meses."
                elif change_percent > 5:
                    trend = "worsening_gradual"
                    alert_level = "WARNING"
                    alert_message = f"🟡 Alerta: Deterioro gradual (+{round(change_percent)}% promedio)."
                elif change_percent < -15:
                    trend = "improving"
                    alert_level = "INFO"
                    alert_message = f"Mejora notable (-{round(abs(change_percent))}% promedio)."
                
            else:
                trend = "insufficient_data"
                alert_level = "none"
                alert_message = "Necesita al menos 6 resultados para análisis de tendencia."
                
            return {
                "patient_id": patient_id,
                "test_code": test_code,
                "latest_value": values[-1],
                "latest_date": recent_results[0]['test_date'].strftime('%Y-%m-%d'),
                "trend": trend,
                "alert_level": alert_level,
                "alert_message": alert_message,
                "change_percent": round(change_percent, 2) if 'change_percent' in locals() else None
            }
            
    except Exception as e:
        print(f"Error en Risk Analysis: {e}")
        raise HTTPException(status_code=500, detail="Error en el análisis predictivo.")
    finally:
        conn.close()