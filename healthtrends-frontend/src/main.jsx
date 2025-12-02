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
    Cognito: {
      // CAMBIO: Agregamos "_COGNITO" para coincidir con tu .env
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      
      // CAMBIO: Agregamos "_COGNITO" aquí también
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
      
      loginWith: {
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