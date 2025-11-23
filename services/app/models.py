from pydantic import BaseModel

class RoleRequest(BaseModel):
    email: str
    role: str

class ProfileRequest(BaseModel):
    full_name: str
    dob: str
    gender: str

class TestTypeRequest(BaseModel):
    code: str
    name: str
    unit: str