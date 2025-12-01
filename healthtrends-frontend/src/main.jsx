import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify';

// --- DIAGNÓSTICO (Opcional: puedes quitarlo en producción) ---
console.log("Configurando Amplify con:");
console.log("User Pool ID:", import.meta.env.VITE_USER_POOL_ID);
console.log("Client ID:", import.meta.env.VITE_APP_CLIENT_ID);
// -----------------------------------------------------------

// Configuración de Amplify con las variables de entorno inyectadas por Docker/Vite
Amplify.configure({
  Auth: {
    Cognito: {
      // Asegúrate de que los nombres de las variables coincidan con los del Dockerfile
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_APP_CLIENT_ID,
      loginWith: {
        email: true,
      },
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)