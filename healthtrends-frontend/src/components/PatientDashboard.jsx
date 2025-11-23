import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function PatientDashboard({ user }) {
  // ... (Lógica del gráfico) ...
  // Si necesitas el código completo de este archivo pídemelo, 
  // pero lo importante ahora era arreglar el PatientSearch.
  
  // Solo para verificar, este archivo DEBE empezar con:
  // export default function PatientDashboard({ user }) { ... }
  
  // ... y NO debe tener la lógica del input de búsqueda.
  
  // (Voy a poner un placeholder aquí, si ya lo tenías bien, déjalo como estaba).
  // Si tienes dudas, copia el código que te di en la respuesta de "Paso 2: Mejorar PatientDashboard.jsx"
  
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState("");
  const [history, setHistory] = useState([]);
  const patientId = user.username; 

  useEffect(() => {
    const loadTests = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        const res = await axios.get(`${READ_URL}/patient/${patientId}/available_tests`, {
          headers: { 'Authorization': token }
        });
        setAvailableTests(res.data);
        if (res.data.length > 0) setSelectedTest(res.data[0].test_code);
      } catch (e) { console.error(e); }
    };
    loadTests();
  }, [patientId]);

  useEffect(() => {
    if (!selectedTest) return;
    const loadData = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const res = await axios.get(`${READ_URL}/patient/${patientId}/trends/${selectedTest}`, {
        headers: { 'Authorization': token }
      });
      setHistory(res.data.history || []);
    };
    loadData();
  }, [selectedTest, patientId]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>👤 Mi Expediente Digital</h2>
      <p style={{color:'#666'}}>Paciente: <strong>{patientId}</strong></p>
      
      {availableTests.length === 0 ? (
        <div style={{padding: '20px', background: '#fff3cd', borderRadius: '5px'}}>
            📭 No tienes resultados de laboratorio todavía.
        </div>
      ) : (
        <div style={{marginTop: '20px'}}>
            <label style={{fontWeight: 'bold', marginRight: '10px'}}>Ver Resultados de:</label>
            <select value={selectedTest} onChange={e => setSelectedTest(e.target.value)} style={{padding: '5px'}}>
                {availableTests.map(t => (
                    <option key={t.test_code} value={t.test_code}>{t.test_name}</option>
                ))}
            </select>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ width: '100%', height: 350, marginTop: '20px' }}>
            <ResponsiveContainer>
                <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="test_date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#28a745" name="Mi Resultado" strokeWidth={3} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}