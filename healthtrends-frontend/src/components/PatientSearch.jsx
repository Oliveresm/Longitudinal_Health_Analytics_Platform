import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// ✅ SEGURIDAD: Leemos la URL desde las variables de entorno (.env)
const READ_URL = import.meta.env.VITE_READ_URL;

export default function PatientSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  // ✅ NUEVO ESTADO: Campo por el que se va a buscar (name, email o id)
  const [searchField, setSearchField] = useState("name"); 

  // 1. Cargar la lista completa al montar
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        // Backend devuelve una lista de objetos: [{ id: "...", name: "Juan (email...)" }, ...]
        const response = await axios.get(`${READ_URL}/patients`, {
            headers: { 'Authorization': token }
        });
        setPatients(response.data);
        setLoading(false);
      } catch (err) { console.error(err); setLoading(false); }
    };
    loadPatients();
  }, []);

  // 2. Filtrar cuando el usuario escribe o cambia el campo de búsqueda
  useEffect(() => {
    if (!query) {
        setFiltered([]);
        return;
    }
    const lowerQ = query.toLowerCase();
    
    const results = patients.filter(p => {
        // ✅ LÓGICA DE FILTRADO MEJORADA
        // Si buscamos por ID, el target es p.id. Si es por nombre/email, el target es p.name (que incluye el email).
        const searchTarget = (searchField === 'id') ? p.id : p.name;
        
        return searchTarget && searchTarget.toLowerCase().includes(lowerQ);
    });
    setFiltered(results);
  }, [query, patients, searchField]); // Se agrega searchField a las dependencias

  // Simplificamos la selección usando el objeto directo
  const handleSelect = (patient) => {
      setQuery(patient.name); // Mostramos el nombre completo en el input
      setShowDropdown(false);
      onSelect(patient.id);   // Enviamos el ID limpio al padre
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Buscar Paciente:</label>
      
      {/* ✅ NUEVO SELECTOR Y CAMPO DE BÚSQUEDA EN UNA SOLA FILA */}
      <div style={{ display: 'flex', gap: '10px' }}>
          <select 
              value={searchField}
              onChange={e => setSearchField(e.target.value)}
              style={{ padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              title="Buscar por..."
          >
              <option value="name">Nombre</option>
              <option value="email">Email</option>
              <option value="id">ID</option>
          </select>
          
          <input 
            placeholder={loading ? "Cargando..." : `Escribe ${searchField}...`}
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            style={{ flex: 1, padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={loading}
          />
      </div>
      
      {showDropdown && filtered.length > 0 && (
        <ul style={{
            position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, 
            background: 'white', border: '1px solid #ccc', 
            listStyle: 'none', padding: 0, margin: 0, zIndex: 1000,
            maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '4px'
        }}>
            {filtered.map((p) => (
                <li 
                    key={p.id} 
                    onClick={() => handleSelect(p)}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                    {p.name}
                </li>
            ))}
        </ul>
      )}
    </div>
  );
}