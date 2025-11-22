import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const READ_URL = import.meta.env.VITE_READ_API_URL || 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function PatientDashboard({ user }) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  // NOTA: En un escenario real, usaríamos user.attributes['custom:patient_id']
  // Para este demo, asumiremos que el ID del paciente es el "Username" con el que se registró.
  const patientId = user.username; 

  useEffect(() => {
    const loadData = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        
        const response = await axios.get(`${READ_URL}/patient/${patientId}/trends/HBA1C`, {
          headers: { 'Authorization': token }
        });
        setHistory(response.data.history || []);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar tus datos. (¿Eres el paciente correcto?)");
      }
    };
    loadData();
  }, [patientId]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>👤 Mis Resultados de Salud</h2>
      <p>Paciente: <strong>{patientId}</strong></p>
      
      {error && <p style={{color: 'red'}}>{error}</p>}
      
      <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
        <ResponsiveContainer>
            <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="test_date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" name="Nivel" />
            </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}