import { useState } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// Leemos la URL del .env (o hardcoded si preferiste dejarlo así)
const INGEST_URL = import.meta.env.VITE_INGEST_API_URL || 'https://hqtxi2jp9l.execute-api.us-east-1.amazonaws.com/prod/ingest';

export default function LabDashboard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ patient_id: "", test_code: "HBA1C", value: "" });

  const uploadData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Subiendo...");

    try {
      // 1. Obtener Token
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();

      // 2. Preparar Payload
      const payload = {
        patient_id: form.patient_id,
        test_code: form.test_code,
        test_name: form.test_code === "HBA1C" ? "Hemoglobin A1c" : "Glucose",
        value: parseFloat(form.value),
        unit: form.test_code === "HBA1C" ? "%" : "mg/dL",
        test_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      // 3. Enviar con Seguridad
      await axios.post(INGEST_URL, payload, {
        headers: { 'Authorization': token }
      });

      setStatus("✅ Dato subido correctamente.");
      setForm({ ...form, value: "" }); // Limpiar valor

    } catch (error) {
      console.error(error);
      // Si el backend devuelve 403, es que no eres del grupo Labs
      const msg = error.response?.status === 403 ? "⛔ No tienes permiso." : error.message;
      setStatus("❌ Error: " + msg);
    }
    setLoading(false);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>🧪 Portal de Laboratorio</h2>
      <p>Subir resultados de análisis</p>
      
      <form onSubmit={uploadData} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
            <label>ID Paciente:</label>
            <input 
            style={{width: '100%', padding: '5px'}}
            placeholder="Ej. TEST001" 
            value={form.patient_id}
            onChange={e => setForm({...form, patient_id: e.target.value})}
            required
            />
        </div>
        
        <div>
            <label>Tipo de Prueba:</label>
            <select style={{width: '100%', padding: '5px'}} value={form.test_code} onChange={e => setForm({...form, test_code: e.target.value})}>
            <option value="HBA1C">HbA1c (Diabetes)</option>
            <option value="GLUCOSE">Glucosa</option>
            </select>
        </div>

        <div>
            <label>Valor:</label>
            <input 
            style={{width: '100%', padding: '5px'}}
            type="number" step="0.1" placeholder="Ej. 5.7" 
            value={form.value}
            onChange={e => setForm({...form, value: e.target.value})}
            required
            />
        </div>

        <button type="submit" disabled={loading} style={{padding: '10px', cursor: 'pointer'}}>
          {loading ? "Subiendo..." : "Subir Resultado"}
        </button>
      </form>
      <p style={{fontWeight: 'bold', marginTop: '10px'}}>{status}</p>
    </div>
  );
}