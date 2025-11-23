from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from typing import Optional
from ..database import get_db_connection
from ..dependencies import get_current_user

router = APIRouter(tags=["Trends"])

@router.get("/patient/{patient_id}/available_tests")
def get_available_tests(patient_id: str, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Patients" in groups and not any(r in groups for r in ["Doctors", "Labs", "Admins"]):
        if (user.get("username") or user.get("sub")) != patient_id: raise HTTPException(status_code=403, detail="Prohibido")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT DISTINCT test_code, test_name FROM lab_results WHERE patient_id = %s ORDER BY test_name", (patient_id,))
            return cursor.fetchall()
    finally: conn.close()

@router.get("/patient/{patient_id}/trends/{test_code}")
def get_trends(patient_id: str, test_code: str, start_date: Optional[str] = None, end_date: Optional[str] = None, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Patients" in groups and not any(r in groups for r in ["Doctors", "Labs", "Admins"]):
        if (user.get("username") or user.get("sub")) != patient_id: raise HTTPException(status_code=403, detail="Prohibido")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            query = "SELECT test_date, value, unit, AVG(value) OVER (ORDER BY test_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg_3_points FROM lab_results WHERE patient_id = %s AND test_code = %s"
            params = [patient_id, test_code]
            if start_date: query += " AND test_date >= %s"; params.append(start_date)
            if end_date: query += " AND test_date <= %s"; params.append(end_date)
            query += " ORDER BY test_date ASC;"
            cursor.execute(query, tuple(params))
            return {"patient_id": patient_id, "test_code": test_code, "history": cursor.fetchall()}
    finally: conn.close()