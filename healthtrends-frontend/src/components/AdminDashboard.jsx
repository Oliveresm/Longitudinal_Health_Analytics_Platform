import { useState } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// Usamos la URL del ALB (donde vive la lógica de Python)
const API_URL = import.meta.env.VITE_READ_API_URL || 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Doctors");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const assignRole = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Procesando...");

    try {
      // 1. Obtener Token de Admin
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();

      // 2. Llamar al endpoint administrativo
      // Nota: Es una petición POST al ALB
      await axios.post(`${API_URL}/admin/assign-role`, 
        { email, role }, 
        { headers: { 'Authorization': token } }
      );

      setStatus(`✅ Éxito: ${email} ahora es ${role}`);
      setEmail(""); // Limpiar campo
      
    } catch (error) {
      console.error(error);
      setStatus("❌ Error: " + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ border: '2px solid #333', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ marginTop: 0 }}>👮‍♂️ Panel de Control (Admin)</h2>
        <p>Gestión de Permisos y Roles de Usuario</p>
        
        <hr />

        <form onSubmit={assignRole} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email del Usuario:</label>
            <input 
              type="email" 
              placeholder="usuario@ejemplo.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rol a Asignar:</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            >
              <option value="Doctors">Doctor (Ver Pacientes)</option>
              <option value="Labs">Laboratorio (Subir Datos)</option>
              <option value="Patients">Paciente (Ver sus datos)</option>
              <option value="Admins">Administrador (Gestión)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '10px', 
              backgroundColor: '#333', 
              color: 'white', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? "Asignando..." : "Asignar Rol"}
          </button>
        </form>

        {status && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#eee', borderRadius: '4px' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}