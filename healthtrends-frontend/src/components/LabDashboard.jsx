import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import PatientSearch from './PatientSearch'; // <--- IMPORTAR EL BUSCADOR

// --- URLs FIJAS (Para evitar errores con .env) ---
const INGEST_URL = 'https://hqtxi2jp9l.execute-api.us-east-1.amazonaws.com/prod/ingest';
const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function LabDashboard() {
  // Estados para la subida de datos
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ patient_id: "", test_code: "", value: "" });
  
  // Estados para el Catálogo Dinámico
  const [testTypes, setTestTypes] = useState([]);
  const [showNewTestForm, setShowNewTestForm] = useState(false);
  const [newTest, setNewTest] = useState({ code: "", name: "", unit: "" });

  // 1. Cargar catálogo al iniciar
  const loadCatalog = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      
      // Llamamos al endpoint /tests
      const response = await axios.get(`${READ_URL}/catalog/tests`, {
          headers: { 'Authorization': token }
      });
      setTestTypes(response.data);
      
      // Seleccionar el primero por defecto
      if(response.data.length > 0 && !form.test_code) {
          setForm(f => ({ ...f, test_code: response.data[0].code }));
      }
    } catch (err) {
      console.error("Error cargando catálogo:", err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // 2. Función para CREAR un nuevo tipo de examen
  const handleCreateTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();

      await axios.post(`${READ_URL}/tests`, newTest, { 
          headers: { 'Authorization': token } 
      });

      setStatus("✅ Nuevo examen creado exitosamente.");
      setShowNewTestForm(false); 
      setNewTest({ code: "", name: "", unit: "" });
      loadCatalog(); 

    } catch (error) {
      console.error(error);
      setStatus("❌ Error creando examen: " + error.message);
    }
    setLoading(false);
  };

  // 3. Función para SUBIR resultados
  const uploadData = async (e) => {
    e.preventDefault();
    if (!form.patient_id) {
        setStatus("❌ Debes seleccionar un paciente.");
        return;
    }

    setLoading(true);
    setStatus("Subiendo...");

    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      
      const selectedTest = testTypes.find(t => t.code === form.test_code);

      const payload = {
        patient_id: form.patient_id, // Usamos el ID seleccionado del buscador
        test_code: form.test_code,
        test_name: selectedTest?.name || "Unknown",
        value: parseFloat(form.value),
        unit: selectedTest?.unit || "",
        test_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

      await axios.post(INGEST_URL, payload, {
        headers: { 'Authorization': token }
      });

      setStatus("✅ Dato subido correctamente.");
      setForm({ ...form, value: "" }); // Limpiamos valor pero mantenemos paciente

    } catch (error) {
      console.error(error);
      const msg = error.response?.status === 403 ? "⛔ No tienes permiso de Lab." : error.message;
      setStatus("❌ Error: " + msg);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      
      {/* TARJETA 1: SUBIR RESULTADOS */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>🧪 Portal de Laboratorio</h2>
        <p>Subir resultados</p>
        
        <form onSubmit={uploadData} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* AQUÍ ESTÁ EL CAMBIO: BUSCADOR DE PACIENTES */}
          <div style={{marginBottom: '5px'}}>
              <PatientSearch onSelect={(id) => setForm({...form, patient_id: id})} />
              {form.patient_id && <small style={{color:'green'}}>Seleccionado: {form.patient_id}</small>}
          </div>
          
          <div>
              <label>Tipo de Prueba:</label>
              <div style={{display: 'flex', gap: '10px'}}>
                  <select 
                      style={{flex: 1, padding: '5px'}} 
                      value={form.test_code} 
                      onChange={e => setForm({...form, test_code: e.target.value})}
                  >
                      {testTypes.map(t => (
                          <option key={t.code} value={t.code}>{t.name} ({t.unit})</option>
                      ))}
                  </select>
                  <button type="button" onClick={() => setShowNewTestForm(!showNewTestForm)} style={{fontSize: '12px', padding: '0 10px'}}>
                    {showNewTestForm ? "-" : "+ Nuevo"}
                  </button>
              </div>
          </div>

          <div>
              <label>Valor:</label>
              <input 
              style={{width: '100%', padding: '5px', boxSizing: 'border-box'}}
              type="number" step="0.1" placeholder="Ej. 5.7" 
              value={form.value}
              onChange={e => setForm({...form, value: e.target.value})}
              required
              />
          </div>

          <button type="submit" disabled={loading} style={{padding: '10px', cursor: 'pointer', background: '#007acc', color: 'white', border: 'none'}}>
            {loading ? "Subiendo..." : "Subir Resultado"}
          </button>
        </form>
      </div>

      {/* TARJETA 2: CREAR NUEVO TIPO DE EXAMEN (CONDICIONAL) */}
      {showNewTestForm && (
        <div style={{ border: '1px solid #28a745', padding: '15px', borderRadius: '8px', background: '#f0fff4' }}>
          <h4 style={{marginTop: 0, color: '#28a745'}}>Definir Nuevo Tipo de Examen</h4>
          <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
                placeholder="Código (Ej. CHOL)" 
                value={newTest.code} 
                onChange={e => setNewTest({...newTest, code: e.target.value.toUpperCase()})} 
                required style={{padding: '5px'}}
            />
            <input 
                placeholder="Nombre (Ej. Colesterol Total)" 
                value={newTest.name} 
                onChange={e => setNewTest({...newTest, name: e.target.value})} 
                required style={{padding: '5px'}}
            />
            <input 
                placeholder="Unidad (Ej. mg/dL)" 
                value={newTest.unit} 
                onChange={e => setNewTest({...newTest, unit: e.target.value})} 
                required style={{padding: '5px'}}
            />
            <button type="submit" disabled={loading} style={{padding: '8px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none'}}>
              Guardar Definición
            </button>
          </form>
        </div>
      )}
      
      {status && <p style={{fontWeight: 'bold', marginTop: '10px', textAlign: 'center'}}>{status}</p>}
    </div>
  );
}