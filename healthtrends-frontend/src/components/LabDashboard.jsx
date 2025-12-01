import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import PatientSearch from './PatientSearch'; 

// --- URLs ---
const INGEST_URL = 'https://hqtxi2jp9l.execute-api.us-east-1.amazonaws.com/prod/ingest';
const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function LabDashboard() {
  // Estados Generales
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [validationErrors, setValidationErrors] = useState([]); 

  // Estado para Carga Masiva (TEXTO)
  const [jsonText, setJsonText] = useState("");

  // Estados Carga Manual
  const [form, setForm] = useState({ 
      patient_id: "", 
      test_code: "", 
      value: "",
      test_date: "" 
  });

  // Estado para ELIMINAR
  const [deleteForm, setDeleteForm] = useState({ 
      patient_id: "", 
      test_code: "", 
      start_date: "", 
      end_date: "" 
  });

  // Estados Catálogo (Solo lectura)
  const [testTypes, setTestTypes] = useState([]);

  // 1. Cargar catálogo
  const loadCatalog = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const response = await axios.get(`${READ_URL}/catalog/tests`, {
          headers: { 'Authorization': token }
      });
      setTestTypes(response.data);
      
      // Pre-selección manual y para borrar
      if(response.data.length > 0) {
          const firstCode = response.data[0].code;
          if (!form.test_code) setForm(f => ({ ...f, test_code: firstCode }));
          if (!deleteForm.test_code) setDeleteForm(f => ({ ...f, test_code: firstCode }));
      }
    } catch (err) { console.error("Error catálogo:", err); }
  };

  useEffect(() => { loadCatalog(); }, []);

  // ---------------------------------------------------------
  // A. VALIDACIÓN Y CARGA MASIVA (TEXTBOX)
  // ---------------------------------------------------------
  const validateAndUpload = async () => {
    setValidationErrors([]);
    setStatus("");

    let parsedData;
    try {
        parsedData = JSON.parse(jsonText);
    } catch (e) {
        setValidationErrors(["❌ Error de Sintaxis: El texto no es un JSON válido."]);
        return;
    }

    if (!Array.isArray(parsedData)) {
        setValidationErrors(["❌ El JSON debe ser una lista [...] (Array)."]);
        return;
    }

    const errors = [];
    const validCodes = testTypes.map(t => t.code);

    parsedData.forEach((item, index) => {
        const rowNum = index + 1;
        if (!item.patient_id) errors.push(`Fila ${rowNum}: Falta 'patient_id'`);
        if (item.value === undefined || item.value === "") errors.push(`Fila ${rowNum}: Falta 'value'`);
        if (!item.test_code) {
            errors.push(`Fila ${rowNum}: Falta 'test_code'`);
        } else if (!validCodes.includes(item.test_code)) {
            errors.push(`Fila ${rowNum}: El código '${item.test_code}' no existe en el catálogo.`);
        }
        if (!item.test_date) errors.push(`Fila ${rowNum}: Falta 'test_date'`);
        else if (isNaN(Date.parse(item.test_date))) {
            errors.push(`Fila ${rowNum}: La fecha '${item.test_date}' no es válida.`);
        }
    });

    if (errors.length > 0) {
        setValidationErrors(errors);
        setStatus("⚠️ Corrige los errores antes de enviar.");
        return;
    }

    setLoading(true);
    setStatus("⏳ Enviando datos válidos...");
    
    try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();

        const res = await axios.post(`${READ_URL}/lab/upload-results`, parsedData, {
            headers: { 
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        setStatus(res.data.message);
        setJsonText(""); 
    } catch (error) {
        console.error(error);
        setStatus("❌ Error del Servidor: " + (error.response?.data?.detail || error.message));
    } finally {
        setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // B. CARGA MANUAL
  // ---------------------------------------------------------
  const uploadData = async (e) => {
    e.preventDefault();
    if (!form.patient_id) return setStatus("❌ Selecciona un paciente.");
    setLoading(true);
    setStatus("Subiendo...");
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const selectedTest = testTypes.find(t => t.code === form.test_code);
      const dateToSend = form.test_date ? form.test_date.replace('T', ' ') + ":00" : new Date().toISOString().slice(0, 19).replace('T', ' ');

      const payload = {
        patient_id: form.patient_id, 
        test_code: form.test_code,
        test_name: selectedTest?.name || "Unknown",
        value: parseFloat(form.value),
        unit: selectedTest?.unit || "",
        test_date: dateToSend
      };

      await axios.post(INGEST_URL, payload, { headers: { 'Authorization': token } });
      setStatus("✅ Dato subido correctamente.");
      setForm(prev => ({ ...prev, value: "" })); 
    } catch (error) {
      setStatus("❌ Error: " + error.message);
    }
    setLoading(false);
  };

  // ---------------------------------------------------------
  // C. ELIMINAR REGISTROS
  // ---------------------------------------------------------
  const handleDelete = async () => {
    if(!deleteForm.patient_id || !deleteForm.start_date || !deleteForm.end_date) {
        setStatus("❌ Para eliminar, debes seleccionar Paciente, Examen y Fechas.");
        return;
    }
    
    const confirmMsg = `⚠️ PELIGRO ⚠️\n\nEstás a punto de ELIMINAR PERMANENTEMENTE los registros de:\nPaciente: ${deleteForm.patient_id}\nExamen: ${deleteForm.test_code}\nDesde: ${deleteForm.start_date}\nHasta: ${deleteForm.end_date}\n\n¿Estás seguro?`;
    
    if(!window.confirm(confirmMsg)) return;

    setLoading(true);
    setStatus("🗑️ Eliminando...");
    
    try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();

        const res = await axios.delete(`${READ_URL}/lab/delete-results`, {
            headers: { 'Authorization': token },
            params: {
                patient_id: deleteForm.patient_id,
                test_code: deleteForm.test_code,
                start_date: deleteForm.start_date,
                end_date: deleteForm.end_date
            }
        });
        setStatus(res.data.message);
    } catch (error) {
        console.error(error);
        setStatus("❌ Error eliminando: " + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', paddingBottom:'50px' }}>
      
      {/* 1. SECCIÓN DE CARGA MASIVA */}
      <div style={{ border: '2px solid #007acc', padding: '20px', borderRadius: '8px', marginBottom: '20px', background: '#f9fcff' }}>
        <h3 style={{marginTop:0, color:'#0056b3'}}>📝 Carga Masiva (Pegar JSON)</h3>
        <p style={{fontSize:'0.9em', color:'#555'}}>Pega aquí tu lista de resultados históricos.</p>
        
        <textarea
            rows="5"
            placeholder='[{ "patient_id": "...", "test_code": "WBC", "value": 5.5, "test_date": "2020-01-01" }]'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            style={{width: '100%', padding: '10px', fontFamily: 'monospace', fontSize: '0.9em', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box'}}
        />

        {validationErrors.length > 0 && (
            <div style={{background: '#fff0f0', borderLeft: '4px solid red', padding: '10px', marginBottom: '10px'}}>
                <strong style={{color: 'red'}}>Errores encontrados:</strong>
                <ul style={{margin: '5px 0', paddingLeft: '20px', color: '#d32f2f', fontSize: '0.9em'}}>
                    {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
            </div>
        )}

        <button onClick={validateAndUpload} disabled={!jsonText || loading} style={{padding: '10px 20px', background: validationErrors.length > 0 ? '#dc3545' : '#007acc', color: 'white', border:'none', borderRadius:'4px', cursor: 'pointer', fontWeight:'bold'}}>
            {loading ? "Validando..." : "Validar y Cargar JSON"}
        </button>
      </div>

      {/* 2. SECCIÓN DE CARGA MANUAL */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{marginTop:0}}>🧪 Ingreso Manual</h3>
        <form onSubmit={uploadData} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
              <PatientSearch onSelect={(id) => setForm(f => ({...f, patient_id: id}))} />
              {form.patient_id && <div style={{fontSize:'0.8em', color:'green', marginTop:'2px'}}>ID: {form.patient_id}</div>}
          </div>
          <div style={{display: 'flex', gap: '10px', alignItems:'center'}}>
              <div style={{flex:1}}>
                <label style={{display:'block', fontSize:'0.9em', fontWeight:'bold'}}>Examen:</label>
                <select style={{width:'100%', padding: '8px', borderRadius:'4px', border:'1px solid #ccc'}} value={form.test_code} onChange={e => setForm({...form, test_code: e.target.value})}>
                    {testTypes.map(t => <option key={t.code} value={t.code}>{t.name} ({t.unit})</option>)}
                </select>
              </div>
          </div>
          <div style={{display:'flex', gap:'15px'}}>
              <div style={{flex:1}}>
                  <label style={{display:'block', fontSize:'0.9em', fontWeight:'bold'}}>Fecha (Opcional):</label>
                  <input type="datetime-local" value={form.test_date} onChange={e => setForm({...form, test_date: e.target.value})} style={{width: '100%', padding: '8px', boxSizing: 'border-box', border:'1px solid #ccc', borderRadius:'4px'}} />
              </div>
              <div style={{flex:1}}>
                  <label style={{display:'block', fontSize:'0.9em', fontWeight:'bold'}}>Valor:</label>
                  <input type="number" step="0.1" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required style={{width: '100%', padding: '8px', boxSizing: 'border-box', border:'1px solid #ccc', borderRadius:'4px'}} />
              </div>
          </div>
          <button type="submit" disabled={loading} style={{padding: '12px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius:'4px', fontWeight:'bold'}}>
            {loading ? "Procesando..." : "Guardar Resultado"}
          </button>
        </form>
      </div>

      {/* 3. ZONA DE PELIGRO (ELIMINAR) */}
      <div style={{ border: '2px solid #dc3545', padding: '20px', borderRadius: '8px', marginBottom: '20px', background: '#fff5f5' }}>
        <h3 style={{marginTop:0, color:'#dc3545'}}>🗑️ Corregir Errores (Eliminar)</h3>
        <p style={{fontSize:'0.9em', color:'#666'}}>Selecciona un rango de fechas para eliminar registros incorrectos.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
              <label style={{fontWeight:'bold', display:'block', marginBottom:'5px'}}>Paciente:</label>
              <PatientSearch onSelect={(id) => setDeleteForm(f => ({...f, patient_id: id}))} />
              {deleteForm.patient_id && <div style={{fontSize:'0.8em', color:'#dc3545', marginTop:'2px'}}>Seleccionado para borrar: {deleteForm.patient_id}</div>}
          </div>

          <div style={{display: 'flex', gap: '10px', flexWrap:'wrap'}}>
              <div style={{flex:1, minWidth:'200px'}}>
                <label style={{display:'block', fontSize:'0.9em', fontWeight:'bold'}}>Examen a borrar:</label>
                <select style={{width:'100%', padding: '8px', borderRadius:'4px', border:'1px solid #ccc'}} value={deleteForm.test_code} onChange={e => setDeleteForm({...deleteForm, test_code: e.target.value})}>
                    {testTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
                </select>
              </div>
              <div style={{flex:1, minWidth:'140px'}}>
                  <label style={{display:'block', fontSize:'0.9em', fontWeight:'bold'}}>Desde:</label>
                  <input type="date" value={deleteForm.start_date} onChange={e => setDeleteForm({...deleteForm, start_date: e.target.value})} style={{width: '100%', padding: '8px', border:'1px solid #ccc', borderRadius:'4px'}} />
              </div>
              <div style={{flex:1, minWidth:'140px'}}>
                  <label style={{display:'block', fontSize:'0.9em', fontWeight:'bold'}}>Hasta:</label>
                  <input type="date" value={deleteForm.end_date} onChange={e => setDeleteForm({...deleteForm, end_date: e.target.value})} style={{width: '100%', padding: '8px', border:'1px solid #ccc', borderRadius:'4px'}} />
              </div>
          </div>

          <button 
            onClick={handleDelete} 
            disabled={loading || !deleteForm.patient_id} 
            style={{padding: '12px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius:'4px', fontWeight:'bold', marginTop:'10px'}}
          >
            ⚠️ ELIMINAR REGISTROS
          </button>
        </div>
      </div>

      {status && (
        <div style={{ padding: '15px', borderRadius: '5px', textAlign: 'center', fontWeight: 'bold', background: status.includes('❌') || status.includes('⚠️') || status.includes('🗑️') ? '#ffecec' : '#e6fffa', color: status.includes('❌') || status.includes('⚠️') || status.includes('🗑️') ? 'red' : 'green', border: `1px solid ${status.includes('❌') ? 'red' : 'green'}` }}>
            {status}
        </div>
      )}
    </div>
  );
}