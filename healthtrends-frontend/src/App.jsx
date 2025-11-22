import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { fetchAuthSession } from 'aws-amplify/auth';

// Importamos TODOS los componentes
import LabDashboard from './components/LabDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard'; // <--- NUEVO

function RoleRouter({ user, signOut }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGroup = async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens.idToken;
        const groups = idToken.payload['cognito:groups'] || [];
        
        // Lógica de prioridad (Admin gana a todo)
        if (groups.includes('Admins')) setGroup('Admins'); // <--- NUEVO
        else if (groups.includes('Labs')) setGroup('Labs');
        else if (groups.includes('Doctors')) setGroup('Doctors');
        else if (groups.includes('Patients')) setGroup('Patients');
        else setGroup('Unknown');
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    checkGroup();
  }, []);

  if (loading) return <div style={{padding: 20}}>Cargando perfil...</div>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Barra Superior */}
      <div style={{ background: '#f0f0f0', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>🏥 HealthTrends <span style={{fontSize: '0.8rem', color: '#666'}}>| {group}</span></h1>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <span>Hola, <b>{user.username}</b></span>
            <button onClick={signOut} style={{ background: '#ff4444', color: 'white', border:'none', padding:'8px 12px', borderRadius: '4px', cursor:'pointer' }}>
            Cerrar Sesión
            </button>
        </div>
      </div>

      {/* Contenido Principal según el Rol */}
      <div style={{ padding: '20px' }}>
        {group === 'Admins' && <AdminDashboard />} {/* <--- NUEVO */}
        {group === 'Labs' && <LabDashboard />}
        {group === 'Doctors' && <DoctorDashboard />}
        {group === 'Patients' && <PatientDashboard user={user} />}
        
        {group === 'Unknown' && (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h3>⚠️ Acceso Limitado</h3>
            <p>Tu usuario no tiene un rol asignado.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <RoleRouter user={user} signOut={signOut} />
      )}
    </Authenticator>
  );
}