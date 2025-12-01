import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      // 👇 PEGA TUS VALORES REALES AQUÍ DIRECTAMENTE (con comillas)
      userPoolId: "us-east-1_wi38Rkw09",
      userPoolClientId: "s2dj8b32cv3fh7nphllpupame",
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