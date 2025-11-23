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
    finally: conn.close()

@router.post("/tests")
def create_test_type(test: TestTypeRequest, user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Labs" not in groups and "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Solo Labs/Admins.")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = "INSERT INTO test_types (code, name, unit) VALUES (%s, %s, %s) ON CONFLICT (code) DO NOTHING"
            cursor.execute(sql, (test.code.upper(), test.name, test.unit))
            conn.commit()
            return {"message": "Examen creado."}
    finally: conn.close()