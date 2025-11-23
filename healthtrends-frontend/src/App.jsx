import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { useState, useEffect } from 'react';

// Componentes
import Landing from './components/Landing';
import LoginPatient from './components/LoginPatient';
import LoginStaff from './components/LoginStaff';
import LabDashboard from './components/LabDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard';

// --- COMPONENTE PROTEGIDO (DASHBOARD) ---
// Este es el que ya tenías, pero ahora vive dentro de una ruta protegida
function DashboardLayout() {
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens) {
        navigate('/'); // Si no hay sesión, volver al inicio
        return;
      }
      
      // Obtener datos del usuario
      const idToken = session.tokens.idToken;
      setUser({ username: idToken.payload['cognito:username'] });
      
      // Obtener grupos
      const groups = idToken.payload['cognito:groups'] || [];
      if (groups.includes('Admins')) setGroup('Admins');
      else if (groups.includes('Labs')) setGroup('Labs');
      else if (groups.includes('Doctors')) setGroup('Doctors');
      else if (groups.includes('Patients')) setGroup('Patients');
      else setGroup('Unknown');

    } catch (e) {
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Navbar */}
      <div style={{ background: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#333', cursor: 'pointer' }} onClick={() => navigate('/')}>🏥 HealthTrends <span style={{fontSize: '0.8rem', color: '#888'}}>| {group}</span></h1>
        <button onClick={handleSignOut} style={{ background: '#ff4444', color: 'white', border:'none', padding:'8px 12px', borderRadius: '4px', cursor:'pointer' }}>
          Cerrar Sesión
        </button>
      </div>

      {/* Contenido */}
      <div style={{ padding: '20px' }}>
        {group === 'Admins' && <AdminDashboard />}
        {group === 'Labs' && <LabDashboard />}
        {group === 'Doctors' && <DoctorDashboard />}
        {group === 'Patients' && <PatientDashboard user={user} />}
        {group === 'Unknown' && <div>⚠️ Usuario sin rol asignado.</div>}
      </div>
    </div>
  );
}

// --- RUTAS PRINCIPALES ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/patient" element={<LoginPatient />} />
        <Route path="/auth/staff" element={<LoginStaff />} />
        <Route path="/dashboard" element={<DashboardLayout />} />
      </Routes>
    </BrowserRouter>
  );
}