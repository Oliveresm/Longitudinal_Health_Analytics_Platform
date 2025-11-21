import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Leer variables de entorno
const INGEST_URL = import.meta.env.VITE_INGEST_API_URL + '/ingest';
const READ_URL = import.meta.env.VITE_READ_API_URL;

// Paciente de prueba
const PATIENT_ID = "TEST001"; 

function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Función para cargar datos del ALB (Backend de Lectura)
  const fetchTrends = async () => {
    try {
      // Llamamos al endpoint que creamos en Python: /patient/{id}/trends/{test}
      const response = await axios.get(`${READ_URL}/patient/${PATIENT_ID}/trends/HBA1C`);
      console.log("Datos recibidos:", response.data);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  // Cargar datos al iniciar
  useEffect(() => {
    fetchTrends();
  }, []);

  // Función para simular un nuevo dato (Backend de Ingesta)
  const simulateNewResult = async () => {
    setLoading(true);
    setStatus("Enviando...");
    
    // Generamos un valor aleatorio realista para HbA1c (entre 5.0 y 9.0)
    const randomValue = (Math.random() * (9.0 - 5.0) + 5.0).toFixed(1);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const payload = {
      patient_id: PATIENT_ID,
      test_code: "HBA1C",
      test_name: "Hemoglobin A1c",
      value: parseFloat(randomValue),
      unit: "%",
      test_date: now
    };

    try {
      // 1. Enviar a API Gateway -> Lambda -> SQS
      await axios.post(INGEST_URL, payload, {
        headers: {
            // Si configuraste Cognito, aquí iría el token. 
            // Si no lo estás enviando desde Postman, asegúrate que tu API Gateway permita auth anónimo 
            // O implementaremos el login de Cognito en el siguiente paso.
            // Por ahora, asumamos que quitaste el Auth o tienes un token hardcodeado de prueba.
             // "Authorization": "Bearer ..." 
        }
      });
      
      setStatus(`Dato enviado: ${randomValue}%. Procesando...`);
      
      // 2. Esperar unos segundos a que el Worker procese SQS -> RDS
      setTimeout(() => {
        setStatus("Actualizando gráfica...");
        fetchTrends(); // Recargar la gráfica
        setLoading(false);
      }, 5000); // Damos 5 segundos al worker

    } catch (error) {
      setStatus("Error enviando dato: " + error.message);
      setLoading(false);
    }
  };

  // ... (imports y lógica anterior igual) ...

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏥 HealthTrends: Panel del Médico</h1>
      <h3>Paciente: {PATIENT_ID} - Monitoreo de Diabetes (HbA1c)</h3>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={simulateNewResult} 
          disabled={loading}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Procesando...' : '💉 Simular Nuevo Análisis de Sangre'}
        </button>
        <p><strong>Estado:</strong> {status}</p>
      </div>

      {/* --- CAMBIO AQUÍ: Quitamos ResponsiveContainer y ponemos tamaño fijo --- */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
          <LineChart width={800} height={400} data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="test_date" />
            <YAxis domain={[4, 14]} label={{ value: '%', angle: -90, position: 'insideLeft' }}/>
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" name="HbA1c Real" strokeWidth={2} />
            <Line type="monotone" dataKey="moving_avg_3_points" stroke="#82ca9d" name="Tendencia (Promedio Móvil)" strokeWidth={2} dot={false} />
          </LineChart>
      </div>
      
      <h4>Historial de Datos (Raw):</h4>
      <pre>{JSON.stringify(history, null, 2)}</pre>
    </div>
  )
}

export default App
