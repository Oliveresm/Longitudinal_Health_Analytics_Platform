import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = import.meta.env.VITE_READ_URL;

export default function AdminDashboard() {
  // --- ESTADOS GESTIÓN DE ROLES ---
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Doctors");
  const [roleStatus, setRoleStatus] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  // --- ESTADOS GESTIÓN DE CATÁLOGO ---
  const [newTest, setNewTest] = useState({ code: "", name: "", unit: "" });
  const [testStatus, setTestStatus] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testsList, setTestsList] = useState([]); 

  // --- ESTADOS GESTIÓN DE USUARIOS ---
  const [usersList, setUsersList] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  // 1. CARGAS INICIALES
  useEffect(() => { 
      loadCatalog(); 
      loadUsers(); 
  }, []);

  const getAuthHeader = async () => {
      const session = await fetchAuthSession();
      return { headers: { 'Authorization': session.tokens.idToken.toString() } };
  };

  // --- LÓGICA DE USUARIOS ---
  const loadUsers = async () => {
      try {
          const config = await getAuthHeader();
          const res = await axios.get(`${API_URL}/admin/users`, config);
          setUsersList(res.data);
      } catch (err) { console.error("Error usuarios:", err); }
  };

  const handleDeleteUser = async (identifier, source) => {
      let msg = "";
      if (source === 'GHOST') msg = `👻 REGISTRO FANTASMA DETECTADO\n\nID: ${identifier}\n\nEste usuario NO existe, solo tiene datos médicos sueltos.\n¿Eliminar todos sus resultados definitivamente?`;
      else if (source === 'DB_ONLY') msg = `🗑️ Usuario antiguo (Solo DB).\nEmail: ${identifier}\n\nNo tiene acceso a la nube.\n¿Borrar perfil y datos?`;
      else msg = `⚠️ PELIGRO: Cuenta ACTIVA.\nEmail: ${identifier}\n\nSe eliminará el acceso y todos los datos médicos.\n¿Estás seguro?`;

      if(!window.confirm(msg)) return;
      
      setUserLoading(true);
      try {
          const config = await getAuthHeader();
          // Enviamos el identificador (Email o ID) al backend
          const res = await axios.delete(`${API_URL}/admin/users/${identifier}`, config);
          alert(`✅ ${res.data.message}`);
          loadUsers(); 
      } catch (error) {
          alert("❌ Error: " + (error.response?.data?.detail || error.message));
      }
      setUserLoading(false);
  };

  // --- LÓGICA DE CATÁLOGO ---
  const loadCatalog = async () => {
    try {
      const config = await getAuthHeader();
      const res = await axios.get(`${API_URL}/catalog/tests`, config);
      setTestsList(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSync = async () => {
      setTestLoading(true); setTestStatus("🔄 Sincronizando...");
      try {
          const config = await getAuthHeader();
          const res = await axios.post(`${API_URL}/catalog/tests/sync`, {}, config);
          setTestStatus(res.data.message); loadCatalog();
      } catch (error) { setTestStatus("❌ Error: " + error.message); }
      setTestLoading(false);
  };

  const handleCreateTest = async (e) => {
    e.preventDefault(); setTestLoading(true); setTestStatus("Creando...");
    try {
      const config = await getAuthHeader();
      await axios.post(`${API_URL}/catalog/tests`, newTest, config);
      setTestStatus(`✅ Examen '${newTest.name}' agregado.`); setNewTest({ code: "", name: "", unit: "" }); loadCatalog(); 
    } catch (error) { setTestStatus("❌ Error: " + (error.response?.data?.detail || error.message)); }
    setTestLoading(false);
  };

  const handleDeleteTest = async (code) => {
      const config = await getAuthHeader();
      if(!window.confirm(`¿Eliminar examen "${code}"?`)) return;
      try {
          await axios.delete(`${API_URL}/catalog/tests/${code}`, config);
          setTestStatus(`🗑️ Examen ${code} eliminado.`); loadCatalog();
      } catch (error) {
          if (error.response && error.response.status === 409) {
              if (window.confirm("⚠️ Hay datos asociados. ¿FORZAR ELIMINACIÓN DE TODO?")) {
                  try {
                      await axios.delete(`${API_URL}/catalog/tests/${code}`, { ...config, params: { cascade: true } });
                      setTestStatus("✅ Borrado total completado."); loadCatalog();
                  } catch (e) { alert(e.message); }
              }
          } else { alert(error.message); }
      }
  };

  // --- LÓGICA DE ROLES ---
  const assignRole = async (e) => {
    e.preventDefault(); setRoleLoading(true); setRoleStatus("Procesando...");
    try {
      const config = await getAuthHeader();
      await axios.post(`${API_URL}/admin/assign-role`, { email, role }, config);
      setRoleStatus(`✅ Éxito: ${email} es ${role}`); setEmail(""); 
    } catch (error) { setRoleStatus("❌ Error: " + (error.response?.data?.detail || error.message)); }
    setRoleLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{textAlign: 'center', marginBottom: '30px'}}>Panel de Administrador</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* COLUMNA 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* TARJETA 1A: LISTA DE USUARIOS */}
            <div style={{ border: '2px solid #007acc', borderRadius: '8px', padding: '20px', backgroundColor: '#f0f8ff' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3 style={{ marginTop: 0, color: '#0056b3' }}>👥 Base de Usuarios</h3>
                    <button onClick={loadUsers} style={{fontSize:'0.8em', cursor:'pointer'}}>🔄</button>
                </div>
                <div style={{maxHeight: '350px', overflowY: 'auto', background: 'white', border: '1px solid #ddd', borderRadius: '4px', marginTop:'10px'}}>
                    {usersList.map((u, idx) => (
                        <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', borderBottom:'1px solid #eee', background: u.source === 'GHOST' ? '#fff3cd' : (u.source === 'DB_ONLY' ? '#fff0f0' : 'white')}}>
                            <div style={{overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%'}}>
                                {/* Mostramos el identificador real (Email o ID Fantasma) */}
                                <strong style={{display:'block', fontSize:'0.9em', color: u.source === 'GHOST' ? '#856404' : (u.source === 'DB_ONLY' ? '#d63384' : '#333')}}>
                                    {u.identifier}
                                </strong>
                                <span style={{fontSize:'0.75em', color: '#666'}}>
                                    {u.name} <br/> {u.status}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleDeleteUser(u.identifier, u.source)}
                                disabled={userLoading}
                                style={{background:'transparent', border:'1px solid #dc3545', color:'#dc3545', borderRadius:'4px', padding:'2px 6px', cursor:'pointer', fontSize:'0.8em'}}
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* TARJETA 1B: ASIGNAR ROL */}
            <div style={{ border: '2px solid #333', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ marginTop: 0 }}>👮‍♂️ Asignar Rol</h3>
                <form onSubmit={assignRole} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{padding:'8px'}} required />
                    <select value={role} onChange={e => setRole(e.target.value)} style={{padding:'8px'}}>
                        <option value="Doctors">Doctor</option><option value="Labs">Laboratorio</option><option value="Patients">Paciente</option><option value="Admins">Admin</option>
                    </select>
                    <button type="submit" disabled={roleLoading} style={{padding:'8px', background:'#333', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>Asignar</button>
                </form>
                {roleStatus && <small style={{display:'block', marginTop:'5px'}}>{roleStatus}</small>}
            </div>
        </div>

        {/* COLUMNA 2: CATÁLOGO */}
        <div style={{ border: '2px solid #28a745', borderRadius: '8px', padding: '20px', backgroundColor: '#f0fff4' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{ marginTop: 0, color: '#28a745' }}>⚙️ Catálogo</h3>
            <button onClick={handleSync} disabled={testLoading} style={{padding:'5px 10px', fontSize:'0.8em', background:'#007bff', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>🔄 Sincronizar</button>
          </div>
          
          <div style={{marginBottom: '20px', marginTop:'10px'}}>
              <form onSubmit={handleCreateTest} style={{ display: 'flex', gap: '5px' }}>
                <input placeholder="Cód" value={newTest.code} onChange={e => setNewTest({...newTest, code: e.target.value.toUpperCase()})} style={{width:'30%', padding:'5px'}} required />
                <input placeholder="Nombre" value={newTest.name} onChange={e => setNewTest({...newTest, name: e.target.value})} style={{width:'40%', padding:'5px'}} required />
                <input placeholder="Unidad" value={newTest.unit} onChange={e => setNewTest({...newTest, unit: e.target.value})} style={{width:'20%', padding:'5px'}} required />
                <button type="submit" disabled={testLoading} style={{background:'#28a745', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>+</button>
              </form>
              {testStatus && <small style={{display:'block', marginTop:'5px', color: testStatus.includes('❌') ? 'red' : 'green'}}>{testStatus}</small>}
          </div>

          <hr style={{borderColor: '#28a745'}} />

          <h4 style={{marginBottom: '10px'}}>Exámenes Activos ({testsList.length}):</h4>
          <div style={{maxHeight: '400px', overflowY: 'auto', background: 'white', border: '1px solid #ddd', borderRadius: '4px'}}>
              {testsList.map(t => (
                  <div key={t.code} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', borderBottom:'1px solid #eee'}}>
                      <div><strong style={{color: '#333'}}>{t.code}</strong> <span style={{color:'#666', fontSize:'0.9em', marginLeft:'8px'}}>{t.name} ({t.unit})</span></div>
                      <button onClick={() => handleDeleteTest(t.code)} style={{background:'transparent', border:'none', cursor:'pointer', fontSize:'1.1em'}} title="Eliminar">🗑️</button>
                  </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}