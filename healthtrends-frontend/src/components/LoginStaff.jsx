import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

// ✅ SEGURIDAD: Este componente es seguro. 
// Usa la configuración global de Amplify (definida en main.jsx con variables de entorno).

// --- COMPONENTE AUXILIAR ---
function RedirectToDashboard() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/dashboard');
  }, [navigate]);

  return <div style={{textAlign: 'center', marginTop: '20px'}}>✅ Logueado. Redirigiendo...</div>;
}

// --- COMPONENTE PRINCIPAL ---
export default function LoginStaff() {
  const navigate = useNavigate();

  // Revisión inicial por si ya estaba logueado
  useEffect(() => {
    fetchAuthSession().then(session => {
      if (session.tokens) navigate('/dashboard');
    }).catch(() => {});
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px' }}>
      <div style={{ borderLeft: '5px solid #007acc', paddingLeft: '20px', marginBottom: '20px' }}>
        <h2 style={{color: '#007acc', margin: 0}}>Acceso Profesional</h2>
        <p style={{margin: 0}}>Médicos y Personal de Laboratorio</p>
      </div>
      
      <Authenticator>
        {({ user }) => (
          // Si hay usuario, renderizamos el componente que redirige
          user ? <RedirectToDashboard /> : null
        )}
      </Authenticator>
    </div>
  );
}