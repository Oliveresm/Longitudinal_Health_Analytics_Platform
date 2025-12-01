import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify';

// 👇 CONFIGURACIÓN FORMATO V5 (Compatibilidad Gen 1)
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    // Pega aquí tus valores reales con comillas
    userPoolId: "us-east-1_wi38Rkw09",
    userPoolWebClientId: "s2dj8b32cv3fh7nphllpupame", // Nota: userPoolWebClientId
    
    // Opcional: configuración de cookies/storage si fuera necesaria
    // cookieStorage: { ... }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)