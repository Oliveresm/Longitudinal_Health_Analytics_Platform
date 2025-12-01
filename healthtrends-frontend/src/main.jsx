import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify';

// src/main.jsx
// ... imports

// src/main.jsx

// ... tus imports

const authConfig = {
  Auth: {
    Cognito: {  // 👈 ¡Este nivel es nuevo en la v6!
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_APP_CLIENT_ID, // 👈 Nota: Cambió de userPoolWebClientId a userPoolClientId
      loginWith: { // 👈 Opcional: Define esto vacío si no usas email/social login explícito, ayuda a evitar el error de undefined
        email: true,
      }
    }
  }
};

Amplify.configure(authConfig);

// ... render
// ... render

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)