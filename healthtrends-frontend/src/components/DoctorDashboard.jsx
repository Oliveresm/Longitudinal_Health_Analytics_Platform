import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const READ_URL = import.meta.env.VITE_READ_API_URL || 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  
  // 1. Cargar lista de pacientes al iniciar
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        // Llamamos al nuevo endpoint que creamos en Python
        const response = await axios.get(`${READ_URL}/patients`, {
            headers: { 'Authorization': token }
        });
        setPatients(response.data);
      } catch (err) {
        setError("Error cargando lista de pacientes. ¿Eres doctor?");
      }
    };
    loadPatients();
  }, []);

  // 2. Cargar historial cuando se selecciona un paciente
  useEffect(() => {
    if (!selectedPatient) return;
    
    const loadData = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const response = await axios.get(`${READ_URL}/patient/${selectedPatient}/trends/HBA1C`, {
        headers: { 'Authorization': token }
      });
      setHistory(response.data.history || []);
    };
    loadData();
  }, [selectedPatient]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>👨‍⚕️ Portal Médico</h2>
      <p>Consulta de expedientes</p>
      
      {error && <p style={{color: 'red'}}>{error}</p>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{marginRight: '10px'}}>Seleccionar Paciente: </label>
        <select onChange={(e) => setSelectedPatient(e.target.value)} value={selectedPatient}>
          <option value="">-- Seleccione --</option>
          {patients.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {selectedPatient && (
        <div style={{ width: '100%', height: 300 }}>
          <h3>Historial de {selectedPatient}</h3>
          <ResponsiveContainer>
            <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="test_date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" name="Nivel" strokeWidth={2}/>
                <Line type="monotone" dataKey="moving_avg_3_points" stroke="#82ca9d" name="Tendencia" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}