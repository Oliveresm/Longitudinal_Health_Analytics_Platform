import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify';

// --- DIAGNÓSTICO: VERIFICAR VARIABLES ---
console.log("User Pool ID:", import.meta.env.VITE_COGNITO_USER_POOL_ID);
console.log("Client ID:", import.meta.env.VITE_COGNITO_APP_CLIENT_ID);
// ----------------------------------------

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)