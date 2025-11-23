import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// URL fija del ALB
const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function PatientSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Cargar la lista completa al montar
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        const response = await axios.get(`${READ_URL}/patients`, {
            headers: { 'Authorization': token }
        });
        setPatients(response.data);
        setLoading(false);
      } catch (err) { console.error(err); setLoading(false); }
    };
    loadPatients();
  }, []);

  // 2. Filtrar cuando el usuario escribe
  useEffect(() => {
    if (!query) {
        setFiltered([]);
        return;
    }
    const lowerQ = query.toLowerCase();
    const results = patients.filter(p => 
        // Buscamos tanto en el texto completo como en el ID si está disponible
        p.toLowerCase().includes(lowerQ)
    );
    setFiltered(results);
  }, [query, patients]);

  const handleSelect = (patientString) => {
      // Extraer ID si viene en formato "Nombre (ID)"
      let id = patientString;
      const match = patientString.match(/\(([^)]+)\)$/);
      if (match) id = match[1];

      setQuery(patientString);
      setShowDropdown(false);
      onSelect(id); // Enviamos el ID limpio al padre
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Buscar Paciente:</label>
      <input 
        placeholder={loading ? "Cargando..." : "Escribe nombre o email..."}
        value={query}
        onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        disabled={loading}
      />
      
      {showDropdown && filtered.length > 0 && (
        <ul style={{
            position: 'absolute', top: '100%', left: 0, right: 0, 
            background: 'white', border: '1px solid #ccc', 
            listStyle: 'none', padding: 0, margin: 0, zIndex: 1000,
            maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            {filtered.map((p, index) => (
                <li 
                    key={index} 
                    onClick={() => handleSelect(p)}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                >
                    {p}
                </li>
            ))}
        </ul>
      )}
    </div>
  );
}