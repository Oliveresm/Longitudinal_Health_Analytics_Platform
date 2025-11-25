import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// URL del ALB
const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  
  // Lista dinámica de exámenes disponibles para EL PACIENTE SELECCIONADO
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(""); 

  const [history, setHistory] = useState([]);

  // 1. Cargar lista de Pacientes al iniciar
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        const res = await axios.get(`${READ_URL}/patients`, {
            headers: { 'Authorization': token }
        });
        setPatients(res.data);
      } catch (err) { console.error(err); }
    };
    loadPatients();
  }, []);

  // Ya no necesitamos esta función, ya que la API nos devuelve el ID/Nombre separados.
  const extractId = (str) => {
    if (!str) return "";
    const match = str.match(/\(([^)]+)\)$/);
    return match ? match[1] : str;
  };

  // 2. Cuando cambia el Paciente -> Cargar qué exámenes tiene disponibles
  useEffect(() => {
    if (!selectedPatient) {
        setAvailableTests([]);
        setHistory([]);
        return;
    }

    const loadPatientTests = async () => {
        try {
            // CAMBIO CLAVE: selectedPatient AHORA ES SOLO EL ID
            const patientId = selectedPatient; 
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            
            // INTEGRACIÓN: Preguntamos a la API qué tiene este paciente
            const res = await axios.get(`${READ_URL}/trends/patient/${patientId}/available_tests`, { // Se agrega /trends
                headers: { 'Authorization': token }
            });
            
            setAvailableTests(res.data);
            
            // Seleccionar el primero automáticamente
            if (res.data.length > 0) {
                setSelectedTest(res.data[0].test_code);
            } else {
                setSelectedTest("");
                setHistory([]);
            }
        } catch (err) { console.error(err); }
    };
    loadPatientTests();
  }, [selectedPatient]);

  // 3. Cargar la Gráfica cuando cambia el Paciente o el Examen
  useEffect(() => {
    if (!selectedPatient || !selectedTest) return;
    
    const loadHistory = async () => {
        const patientId = selectedPatient; // CAMBIO CLAVE: selectedPatient AHORA ES SOLO EL ID
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken.toString();
            const res = await axios.get(`${READ_URL}/trends/patient/${patientId}/trends/${selectedTest}`, { // Se agrega /trends
                headers: { 'Authorization': token }
            });
            setHistory(res.data.history || []);
        } catch (err) { console.error(err); }
    };
    loadHistory();
  }, [selectedPatient, selectedTest]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>👨‍⚕️ Portal Médico (Integrado)</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', background: '#f0f8ff', padding: '15px', borderRadius: '8px' }}>
        
        {/* 1. Seleccionar Paciente */}
        <div>
            <label style={{display:'block', fontWeight:'bold', fontSize:'0.9em'}}>1. Seleccionar Paciente:</label>
            <select onChange={(e) => setSelectedPatient(e.target.value)} value={selectedPatient} style={{padding: '8px', minWidth: '200px'}}>
            <option value="">-- Seleccionar --</option>
            
            {/* ❌ CORRECCIÓN: ESTA ERA LA LÍNEA CAUSANTE DEL ERROR [object Object] */}
            {patients.map(p => (
                <option key={p.id} value={p.id}>
                    {p.name}
                </option>
            ))}
            </select>
        </div>

        {/* 2. Seleccionar Examen (Dinámico) */}
        <div>
            <label style={{display:'block', fontWeight:'bold', fontSize:'0.9em'}}>2. Ver Resultados de:</label>
            {availableTests.length > 0 ? (
                <select onChange={(e) => setSelectedTest(e.target.value)} value={selectedTest} style={{padding: '8px', minWidth: '200px'}}>
                    {availableTests.map(t => (
                        <option key={t.test_code} value={t.test_code}>{t.test_name}</option>
                    ))}
                </select>
            ) : (
                <span style={{color: '#666', fontStyle: 'italic', lineHeight: '2.5'}}>
                    {selectedPatient ? "Este paciente no tiene exámenes." : "Selecciona un paciente primero."}
                </span>
            )}
        </div>
      </div>

      {/* Gráfica */}
      {history.length > 0 ? (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ width: 800, height: 350 }}>
                <ResponsiveContainer>
                    <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="test_date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#007acc" name="Valor Medido" strokeWidth={3} activeDot={{r:6}} />
                        <Line type="monotone" dataKey="moving_avg_3_points" stroke="#ff7300" name="Promedio Móvil" strokeDasharray="5 5" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      ) : selectedPatient && selectedTest ? (
          <p>No hay datos históricos para este examen.</p>
      ) : null}
    </div>
  );
}