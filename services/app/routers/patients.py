from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from ..database import get_db_connection
from ..dependencies import get_current_user
from ..models import ProfileRequest

router = APIRouter(tags=["Patients"])

@router.post("/profile")
def update_profile(profile: ProfileRequest, user: dict = Depends(get_current_user)):
    patient_id = user.get("username") or user.get("sub")
    email = user.get("email")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
            INSERT INTO patient_profiles (patient_id, full_name, dob, gender, email)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (patient_id) DO UPDATE SET 
            full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, gender = EXCLUDED.gender, email = EXCLUDED.email;
            """
            cursor.execute(sql, (patient_id, profile.full_name, profile.dob, profile.gender, email))
            conn.commit()
            return {"message": "Perfil actualizado"}
    finally: conn.close()

@router.get("/patients")
def list_patients(user: dict = Depends(get_current_user)):
    groups = user.get("cognito:groups", [])
    if "Doctors" not in groups and "Labs" not in groups and "Admins" not in groups:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = """
            SELECT COALESCE(p.patient_id, l.patient_id) as id, COALESCE(p.full_name, 'Sin Nombre') as name, p.email
            FROM patient_profiles p FULL OUTER JOIN (SELECT DISTINCT patient_id FROM lab_results) l ON p.patient_id = l.patient_id ORDER BY name;
            """
            cursor.execute(sql)
            results = cursor.fetchall()
            formatted = []
            for row in results:
                display = row['name']
                if row.get('email'): display += f" ({row['email']})"
                elif row['name'] == 'Sin Nombre': display += f" (ID: {row['id'][:8]}...)"
                formatted.append({"id": row['id'], "name": display})
            return formatted
    finally: conn.close()