import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Syringe, RefreshCw, AlertCircle } from 'lucide-react';

// --- CONFIGURACIÓN DE VARIABLES DE ENTORNO ---
// NOTA: Para que este código funcione en la vista previa web, he tenido que usar
// las URLs directas. En tu proyecto local con Vite, debes descomentar las líneas 
// que usan `import.meta.env` y comentar las versiones hardcoded.

// const INGEST_URL = import.meta.env.VITE_INGEST_URL || 'https://hqtxi2jp9l.execute-api.us-east-1.amazonaws.com/prod/ingest';
const INGEST_URL = 'https://hqtxi2jp9l.execute-api.us-east-1.amazonaws.com/prod/ingest';

// const READ_URL = import.meta.env.VITE_READ_URL || 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';
const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

const PATIENT_ID = "TEST001";

export default function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para cargar datos
  const fetchTrends = async () => {
    try {
      console.log(`Consultando: ${READ_URL}/patient/${PATIENT_ID}/trends/HBA1C`);
      const response = await axios.get(`${READ_URL}/patient/${PATIENT_ID}/trends/HBA1C`);
      console.log("Datos recibidos:", response.data);
      setHistory(response.data.history || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error cargando datos:", error);
      setStatus("Error al cargar historial.");
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  // Función para enviar datos
  const simulateNewResult = async () => {
    setLoading(true);
    setStatus("Enviando datos a la nube...");
    
    // Generar valor aleatorio entre 5.0 y 9.0
    const randomValue = (Math.random() * (9.0 - 5.0) + 5.0).toFixed(1);
    // Formato de fecha simple YYYY-MM-DD HH:mm:ss
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
      console.log(`Enviando a: ${INGEST_URL}`, payload);
      
      // Enviamos sin autenticación
      await axios.post(INGEST_URL, payload);
      
      setStatus(`Dato enviado: ${randomValue}%. Esperando procesamiento...`);
      
      // Esperar a que el backend/worker procese (simulado con 5s de espera)
      setTimeout(() => {
        setStatus("Actualizando gráfica...");
        fetchTrends();
        setLoading(false);
        setStatus("Sincronización completa.");
      }, 5000);

    } catch (error) {
      console.error("Error en Ingesta:", error);
      setStatus("Error: " + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
              <Activity className="text-blue-600" />
              HealthTrends: Panel Médico
            </h1>
            <p className="text-slate-500 mt-1">
              Paciente: <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{PATIENT_ID}</span>
              {' • '}
              Monitoreo de Diabetes (HbA1c)
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
             <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Fuente de datos</div>
             <div className="text-xs font-mono text-slate-600 truncate max-w-[200px]">{READ_URL}</div>
          </div>
        </div>

        {/* Panel de Control */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Tarjeta de Acción */}
          <div className="bg-white p-6 rounded-xl shadow-sm md:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-4">Acciones</h3>
              <button 
                onClick={simulateNewResult} 
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                  loading 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg active:scale-95'
                }`}
              >
                {loading ? (
                  <><RefreshCw className="animate-spin h-5 w-5" /> Procesando...</>
                ) : (
                  <><Syringe className="h-5 w-5" /> Simular Análisis</>
                )}
              </button>
            </div>
            
            <div className="mt-6 bg-slate-50 p-3 rounded border border-slate-100">
              <p className="text-sm font-medium text-slate-500 mb-1">Estado del Sistema:</p>
              <p className={`text-sm ${status.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
                {status || "Esperando acción..."}
              </p>
            </div>
          </div>

          {/* Gráfica */}
          <div className="bg-white p-6 rounded-xl shadow-sm md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Tendencia Histórica</h3>
              {lastUpdate && <span className="text-xs text-slate-400">Actualizado: {lastUpdate}</span>}
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="test_date" 
                    tick={{fontSize: 12}} 
                    tickFormatter={(tick) => tick.split(' ')[0]} // Mostrar solo fecha
                    stroke="#94a3b8"
                  />
                  <YAxis domain={[4, 14]} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    name="HbA1c Real" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="moving_avg_3_points" 
                    stroke="#10b981" 
                    name="Tendencia (Promedio Móvil)" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Raw Data Debugger */}
        <div className="bg-slate-900 rounded-xl p-6 text-slate-300 overflow-hidden">
          <h4 className="text-sm font-mono font-bold text-slate-500 mb-3 uppercase tracking-wider">Debug: Raw Data Log</h4>
          <div className="bg-slate-950 rounded p-4 overflow-x-auto max-h-40 custom-scrollbar">
            <pre className="text-xs font-mono">
              {history.length > 0 ? JSON.stringify(history, null, 2) : "// No hay datos cargados todavía..."}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}