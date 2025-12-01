import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify';

// src/main.jsx
// ... imports

const authConfig = {
  Auth: {
    region: 'us-east-1',
    // ⚠️ Vite usa import.meta.env, NO process.env
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_APP_CLIENT_ID,
  }
};

// Log para depuración (puedes quitarlo después)
console.log("Configurando Auth con:", authConfig.Auth);

Amplify.configure(authConfig);

// ... render

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)