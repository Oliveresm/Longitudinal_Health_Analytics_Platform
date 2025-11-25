import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import axios from 'axios';

// Usamos la URL de LECTURA (ALB) porque ahí está la lógica de perfiles
const API_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

// --- Componente Interno: Sincronizador ---
function ProfileSyncWrapper() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Sincronizando perfil...");

  useEffect(() => {
    const syncData = async () => {
      try {
        // 1. Obtener datos de Cognito
        const attributes = await fetchUserAttributes();
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();

        console.log("Atributos de Cognito:", attributes);

        // 2. Enviar a tu Base de Datos (RDS) via ALB
        // ✅ CORRECCIÓN: Se agrega el prefijo /patients a la ruta /profile
        await axios.post(`${API_URL}/patients/profile`, {
          full_name: attributes.name,
          dob: attributes.birthdate,
          gender: attributes.gender
        }, {
          headers: { 'Authorization': token }
        });

        setStatus("¡Perfil guardado! Entrando...");
        
        // 3. Redirigir al Dashboard
        setTimeout(() => navigate('/dashboard'), 1000);

      } catch (error) {
        console.error("Error sincronizando perfil:", error);
        // Si falla la sincronización, dejamos pasar al usuario de todos modos
        navigate('/dashboard');
      }
    };
    syncData();
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '20px', color: '#007acc' }}>
      <h3>✅ Login Exitoso</h3>
      <p>{status}</p>
    </div>
  );
}

// --- Componente Principal ---
export default function LoginPatient() {
  const navigate = useNavigate();
  
  // Si ya hay sesión activa al cargar la página, ir directo al dashboard
  useEffect(() => {
    fetchAuthSession().then(session => {
      if (session.tokens) navigate('/dashboard');
    }).catch(() => {});
  }, [navigate]);

  const formFields = {
    signUp: {
      name: { order: 1, label: 'Nombre Completo', placeholder: 'Ej. Ana García', isRequired: true },
      email: { order: 2, placeholder: 'tu@email.com', isRequired: true },
      birthdate: { order: 3, label: 'Fecha de Nacimiento', isRequired: true },
      gender: { order: 4, label: 'Género', placeholder: 'M / F', isRequired: true },
      password: { order: 5 },
      confirm_password: { order: 6 }
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px' }}>
      <h2 style={{color: '#2c3e50'}}>Portal de Pacientes</h2>
      <p>Regístrate para crear tu expediente digital</p>
      
      <Authenticator 
        initialState="signUp"
        loginMechanisms={['email']}
        formFields={formFields}
        // Importante: Pedimos estos datos a Cognito para poder leerlos después
        signUpAttributes={['name', 'birthdate', 'gender']}
      >
        {({ user }) => (
          // Una vez logueado, mostramos el Sincronizador
          <ProfileSyncWrapper />
        )}
      </Authenticator>
    </div>
  );
}